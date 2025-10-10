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
} from "@/stores/creditStore";
import type {
  AccountOwnerType,
  CreditAction,
  ConsumeActor,
  CreditTx,
  ConsumeResult as _ConsumeResult,
} from "@/types/credit";

export type InitSeed = {
  adminId: string;
  companyIds: string[];
  members: { type: AccountOwnerType; id: string }[];
  defaults?: { balance?: number; threshold?: number };
};

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

export function getBalances(accountIds: string[]) {
  return getBalancesByIds(accountIds);
}

export function getAccountBalance(accountId: string) {
  return storeGetBalance(accountId);
}

export function simulate(
  action: CreditAction,
  actor: ConsumeActor,
  qty = 1
) {
  return storeSimulate(action, actor, qty);
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
      },
  maybeActor?: ConsumeActor,
  maybeQty = 1
) {
  let action: CreditAction;
  let actor: ConsumeActor;
  let qty: number;

  if (typeof actionOrParams === "object") {
    action = actionOrParams.action;
    const ownerType = (actionOrParams as any).ownerType ?? "company";
    const ownerId = (actionOrParams as any).ownerId ?? (actionOrParams as any).payer;
    const companyId = (actionOrParams as any).companyId ?? (actionOrParams as any).company;
    actor = { ownerType, ownerId, companyId } as ConsumeActor;
    qty = Number.isInteger(actionOrParams.qty) && actionOrParams.qty! > 0 ? actionOrParams.qty! : 1;
  } else {
    action = actionOrParams;
    actor = maybeActor as ConsumeActor;
    qty = Number.isInteger(maybeQty) && maybeQty > 0 ? maybeQty : 1;
  }

  const res = storeSimulate(action, actor, qty);
  if (!res.payer) {
    const reason = String(res.reason ?? "INSUFFICIENT_FUNDS");
    const err: any = new Error(reason);
    err.code = reason;
    throw err;
  }
  return res;
}

function isErr(res: _ConsumeResult): res is Extract<_ConsumeResult, { ok: false }> {
  return res.ok === false;
}
function normalizeReason(reason?: string, detail?: any): "INSUFFICIENT_FUNDS" | "NO_PAYER" | "RACE_CONDITION" {
  if (reason === "INSUFFICIENT_FUNDS" || reason === "NO_PAYER") return reason;
  const d = typeof detail === "string" ? detail : JSON.stringify(detail || {});
  if (d.includes("Race condition")) return "RACE_CONDITION";
  return "NO_PAYER";
}

type ConsumeRef = {
  kind?: string;
  id?: string;
  productId?: string;
  eventId?: string;
  islandId?: string;
  actorDid?: string;
} & Record<string, any>;

export function consumeForAction(
  action: CreditAction,
  actor: ConsumeActor,
  ref?: ConsumeRef,
  qty = 1
): { ok: true; tx: CreditTx; payerAccountId: string } | { ok: false; reason: "INSUFFICIENT_FUNDS" | "NO_PAYER" | "RACE_CONDITION"; detail?: any } {
  const res = storeConsume(action, actor, ref, qty);
  if (isErr(res)) return { ok: false, reason: normalizeReason(String(res.reason), res.detail), detail: res.detail };
  return { ok: true, tx: res.tx, payerAccountId: res.payerAccountId! };
}

// alias espliciti richiesti
export function grant(toAccountId: string, amount: number, meta?: any) {
  return topup(toAccountId, amount, meta);
}

export function transferBetween(fromAccountId: string, toAccountId: string, amount: number, meta?: any) {
  return transfer(fromAccountId, toAccountId, amount, meta);
}

export function spend(
  action: CreditAction,
  actor: ConsumeActor,
  ref?: ConsumeRef,
  qty = 1,
  dedup_key?: string
): { ok: true; tx: CreditTx; payerAccountId: string } | { ok: false; reason: "INSUFFICIENT_FUNDS" | "NO_PAYER" | "RACE_CONDITION"; detail?: any } {
  const res = storeSpend(action, actor, ref, qty, dedup_key);
  if (isErr(res)) return { ok: false, reason: normalizeReason(String(res.reason), res.detail), detail: res.detail };
  return { ok: true, tx: res.tx, payerAccountId: res.payerAccountId! };
}

export function listTransactions(params?: { accountId?: string; limit?: number }) {
  return history(params);
}

export function topupAccount(toAccountId: string, amount: number, meta?: any) {
  return topup(toAccountId, amount, meta);
}

export function setThreshold(accountId: string, threshold: number) {
  // delega al layer store
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setLowBalanceThreshold } = require("@/stores/creditStore");
  setLowBalanceThreshold(accountId, threshold);
}

export function accountId(ownerType: AccountOwnerType, ownerId: string) {
  return getAccountId(ownerType, ownerId);
}

/** Crea (se mancante) l’account del membro: creator/operator/machine/admin. */
export function ensureMemberAccount(
  ownerType: AccountOwnerType,
  ownerId: string,
  initialBalance = 0,
  threshold?: number
) {
  return storeEnsureMemberAccount(ownerType, ownerId, initialBalance, threshold);
}

/** Fallback: aziende presenti nel ledger crediti (se Identity non risponde). */
export function listCompanyAccounts(): Array<{ did: string }> {
  return storeListAccounts({ ownerType: "company" }).map((a) => ({ did: a.ownerId }));
}
