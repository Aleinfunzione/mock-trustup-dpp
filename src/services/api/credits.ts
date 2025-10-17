// src/services/api/credits.ts
import {
  getAccountId,
  getBalance as storeGetBalance,
  getBalancesByIds,
  ensureAccounts,
  initCredits as initStoreCredits,
  ensureCompanyAccount,
  ensureMemberAccount as storeEnsureMemberAccount,
  simulate as storeSimulate,
  consume as storeConsume,
  spend as storeSpend,
  history,
  topup,
  transfer,
  listAccounts as storeListAccounts,
  setLowBalanceThreshold,
  getIslandBudget,
  setIslandBudget,
  addToIslandBudget,
} from "@/stores/creditStore";
import type {
  AccountOwnerType,
  CreditAction,
  ConsumeActor,
  CreditTx,
  ConsumeResult as _ConsumeResult,
} from "@/types/credit";
// opzionale: sorgente Identity
import * as IdentityApi from "@/services/api/identity";

/* ---------------------------------------------------------------------------------- */
/* Types & const                                                                      */
/* ---------------------------------------------------------------------------------- */

export type InitSeed = {
  adminId: string;
  companyIds: string[];
  members: { type: AccountOwnerType; id: string }[];
  defaults?: { balance?: number; threshold?: number };
};

export type Company = { did: string; name?: string };

export const CREDIT_ERRORS = {
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  NO_PAYER: "NO_PAYER",
  POLICY_DENY: "POLICY_DENY",
  CHAIN_BLOCKED: "CHAIN_BLOCKED",
  RACE_CONDITION: "RACE_CONDITION",
} as const;

type ConsumeRef = {
  kind?: string;
  id?: string;
  productId?: string;
  eventId?: string;
  islandId?: string;
  actorDid?: string;
} & Record<string, any>;

type OkBase = { ok: true; tx: CreditTx; payerAccountId: string; cost?: number; bucketId?: string };
type ErrBase = { ok: false; reason: (typeof CREDIT_ERRORS)[keyof typeof CREDIT_ERRORS]; detail?: any };

/* ---------------------------------------------------------------------------------- */
/* Boot / setup                                                                       */
/* ---------------------------------------------------------------------------------- */

export function initCredits(seed: InitSeed) {
  const firstCompany = seed.companyIds?.[0];
  initStoreCredits({
    adminId: seed.adminId,
    companyId: firstCompany,
    members: seed.members,
    companyDefault: seed.defaults?.balance,
    defaultThreshold: seed.defaults?.threshold,
  });

  if (seed.companyIds && seed.companyIds.length > 1) {
    for (const cid of seed.companyIds.slice(1)) {
      ensureCompanyAccount(cid, seed.defaults?.balance, seed.defaults?.threshold);
    }
  }

  ensureAccounts({
    adminId: seed.adminId,
    companyIds: seed.companyIds,
    memberIds: seed.members,
    defaults: seed.defaults,
  });
}

/* ---------------------------------------------------------------------------------- */
/* Read APIs                                                                          */
/* ---------------------------------------------------------------------------------- */

export function listAccounts(params?: {
  ownerType?: AccountOwnerType;
  companyId?: string;
  ownerId?: string;
}) {
  return storeListAccounts(params);
}

export function getBalances(accountIds: string[]) {
  return getBalancesByIds(accountIds);
}

export function getAccountBalance(accountId: string) {
  return storeGetBalance(accountId);
}
export const getBalance = getAccountBalance;

export function accountId(ownerType: AccountOwnerType, ownerId: string) {
  return getAccountId(ownerType, ownerId);
}

/** Fallback: aziende presenti nel ledger crediti (se Identity non risponde). */
export function listCompanyAccounts(): Array<{ did: string }> {
  return storeListAccounts({ ownerType: "company" }).map((a) => ({ did: a.ownerId }));
}

/* ---------------------------------------------------------------------------------- */
/* Simulation / spend                                                                 */
/* ---------------------------------------------------------------------------------- */

export function simulate(action: CreditAction, actor: ConsumeActor, qty = 1, context?: any) {
  return storeSimulate(action, actor, qty, context);
}

export function simulateCost(
  actionOrParams:
    | CreditAction
    | {
        action: CreditAction;
        payer?: string;
        company?: string;
        ownerType?: AccountOwnerType;
        ownerId?: string;
        companyId?: string;
        qty?: number;
        context?: any;
      },
  maybeActor?: ConsumeActor,
  maybeQty = 1,
  maybeContext?: any
) {
  let action: CreditAction;
  let actor: ConsumeActor;
  let qty: number;
  let context: any;

  if (typeof actionOrParams === "object") {
    action = actionOrParams.action;
    const ownerType = (actionOrParams as any).ownerType ?? "company";
    const ownerId = (actionOrParams as any).ownerId ?? (actionOrParams as any).payer;
    const companyId = (actionOrParams as any).companyId ?? (actionOrParams as any).company;
    actor = { ownerType, ownerId, companyId } as ConsumeActor;
    qty = Number.isInteger(actionOrParams.qty) && actionOrParams.qty! > 0 ? actionOrParams.qty! : 1;
    context = actionOrParams.context;
  } else {
    action = actionOrParams;
    actor = maybeActor as ConsumeActor;
    qty = Number.isInteger(maybeQty) && maybeQty > 0 ? maybeQty : 1;
    context = maybeContext;
  }

  const res = storeSimulate(action, actor, qty, context);
  if (!(res as any).payer) {
    const reason = String((res as any).reason ?? CREDIT_ERRORS.INSUFFICIENT_FUNDS);
    const err: any = new Error(reason);
    err.code = reason;
    throw err;
  }
  return res;
}

function isErr(res: _ConsumeResult): res is Extract<_ConsumeResult, { ok: false }> {
  return res.ok === false;
}

function normalizeReason(
  reason?: string,
  detail?: any
): (typeof CREDIT_ERRORS)[keyof typeof CREDIT_ERRORS] {
  if (
    reason === CREDIT_ERRORS.INSUFFICIENT_FUNDS ||
    reason === CREDIT_ERRORS.NO_PAYER ||
    reason === CREDIT_ERRORS.POLICY_DENY ||
    reason === CREDIT_ERRORS.CHAIN_BLOCKED ||
    reason === CREDIT_ERRORS.RACE_CONDITION
  ) {
    return reason;
  }
  const d = typeof detail === "string" ? detail : JSON.stringify(detail || {});
  if (d.match(/race/i)) return CREDIT_ERRORS.RACE_CONDITION;
  if (d.match(/policy/i)) return CREDIT_ERRORS.POLICY_DENY;
  if (d.match(/blocked|chain/i)) return CREDIT_ERRORS.CHAIN_BLOCKED;
  return CREDIT_ERRORS.NO_PAYER;
}

export function consumeForAction(
  action: CreditAction,
  actor: ConsumeActor,
  ref?: ConsumeRef,
  qty = 1
): OkBase | ErrBase {
  const res = storeConsume(action, actor, ref, qty);
  if (isErr(res)) return { ok: false, reason: normalizeReason(String(res.reason), res.detail), detail: res.detail };
  return {
    ok: true,
    tx: res.tx,
    payerAccountId: res.payerAccountId!,
    cost: (res as any).cost,
    bucketId: (res as any).bucketId,
  };
}

export function spend(
  action: CreditAction,
  actor: ConsumeActor,
  ref?: ConsumeRef,
  qty = 1,
  dedup_key?: string
): OkBase | ErrBase {
  const res = storeSpend(action, actor, ref, qty, dedup_key);
  if (isErr(res)) return { ok: false, reason: normalizeReason(String(res.reason), res.detail), detail: res.detail };
  return {
    ok: true,
    tx: res.tx,
    payerAccountId: res.payerAccountId!,
    cost: (res as any).cost,
    bucketId: (res as any).bucketId,
  };
}

/* ---------------------------------------------------------------------------------- */
/* Mutations                                                                          */
/* ---------------------------------------------------------------------------------- */

export function grant(toAccountId: string, amount: number, meta?: any) {
  return topup(toAccountId, amount, meta);
}

export function transferBetween(fromAccountId: string, toAccountId: string, amount: number, meta?: any) {
  return transfer(fromAccountId, toAccountId, amount, meta);
}

export function topupAccount(toAccountId: string, amount: number, meta?: any) {
  return topup(toAccountId, amount, meta);
}

export function setThreshold(accountId: string, threshold: number) {
  setLowBalanceThreshold(accountId, threshold);
}

/* ---------------------------------------------------------------------------------- */
/* History                                                                            */
/* ---------------------------------------------------------------------------------- */

export function listTransactions(params?: { accountId?: string; limit?: number }) {
  return history(params);
}

/* ---------------------------------------------------------------------------------- */
/* Accounts helpers                                                                    */
/* ---------------------------------------------------------------------------------- */

export function ensureMemberAccount(
  ownerType: AccountOwnerType,
  ownerId: string,
  initialBalance = 0,
  threshold?: number
) {
  return storeEnsureMemberAccount(ownerType, ownerId, initialBalance, threshold);
}

/* ---------------------------------------------------------------------------------- */
/* Companies discovery (centralizzato)                                                 */
/* ---------------------------------------------------------------------------------- */

export async function listCompanies(): Promise<Company[]> {
  const fromIdentity = await discoverCompaniesFromIdentity();
  if (fromIdentity.length) return dedupeCompanies(fromIdentity);
  const fromLedger = listCompanyAccounts();
  return dedupeCompanies(fromLedger);
}

async function discoverCompaniesFromIdentity(): Promise<Company[]> {
  const api: any = IdentityApi as any;
  const nameCandidates = [
    "listCompanies",
    "getCompanies",
    "listOrganizations",
    "getOrganizations",
    "listAllCompanies",
    "listOrgs",
    "companies",
    "orgs",
    "list",
  ];
  // prefer funzioni note
  for (const name of nameCandidates) {
    const fn = api?.[name];
    if (typeof fn === "function") {
      try {
        const res = await Promise.resolve(fn());
        const arr = normalizeCompanyArray(res);
        if (arr.length) return arr;
      } catch {}
    }
  }
  // poi export array
  for (const name of nameCandidates) {
    const val = api?.[name];
    if (Array.isArray(val)) {
      const arr = normalizeCompanyArray(val);
      if (arr.length) return arr;
    }
  }
  // infine tentativo su tutti gli export
  try {
    const allExports = Object.values(api);
    for (const v of allExports) {
      if (Array.isArray(v)) {
        const arr = normalizeCompanyArray(v);
        if (arr.length) return arr;
      }
      if (typeof v === "function") {
        try {
          const res = await Promise.resolve((v as any)());
          const arr = normalizeCompanyArray(res);
          if (arr.length) return arr;
        } catch {}
      }
    }
  } catch {}
  return [];
}

function normalizeCompanyArray(x: any): Company[] {
  if (!x) return [];
  const arr = Array.isArray(x) ? x : Array.isArray(x?.companies) ? x.companies : [];
  return arr
    .map((c: any) => ({
      did: c?.did || c?.id || "",
      name: c?.name || c?.displayName || c?.title,
    }))
    .filter((c: Company) => typeof c.did === "string" && c.did.startsWith("did:"));
}

function dedupeCompanies(list: Company[]): Company[] {
  const m = new Map<string, Company>();
  for (const c of list) if (c.did && !m.has(c.did)) m.set(c.did, c);
  return Array.from(m.values());
}

/* ---------------------------------------------------------------------------------- */
/* Re-export utili per CompanyCreditsPage                                             */
/* ---------------------------------------------------------------------------------- */

export { ensureCompanyAccount, getIslandBudget, setIslandBudget, addToIslandBudget };
