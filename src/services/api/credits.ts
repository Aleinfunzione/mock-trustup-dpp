// src/services/api/credits.ts (patch: tipo ref con id obbligatorio)
import {
  getAccountId,
  getBalance,
  getBalancesByIds,
  ensureAccounts,
  initCredits as initStoreCredits,
  ensureCompanyAccount,
  simulate as storeSimulate,
  consume as storeConsume,
  history,
  topup,
  transfer,
  isLowBalance,
  setLowBalanceThreshold,
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

export function simulateCost(
  actionOrParams:
    | CreditAction
    | { action: CreditAction; payer?: string; company?: string; ownerType?: AccountOwnerType; ownerId?: string; companyId?: string; qty?: number },
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

// >>> fix qui: id obbligatorio
type ConsumeRef = { kind: string; id: string } & Record<string, any>;

export function consumeForAction(
  action: CreditAction,
  actor: ConsumeActor,
  ref?: ConsumeRef,
  qty = 1
): { ok: true; tx: CreditTx; payerAccountId: string } | { ok: false; reason: string; detail?: any } {
  const res = storeConsume(action, actor, ref, qty);
  if (isErr(res)) return { ok: false, reason: String(res.reason), detail: res.detail };
  return { ok: true, tx: res.tx, payerAccountId: res.payerAccountId! };
}

export function listTransactions(params?: { accountId?: string; limit?: number }) {
  return history(params);
}

export function topupAccount(toAccountId: string, amount: number, meta?: any) {
  return topup(toAccountId, amount, meta);
}

export function transferBetween(fromAccountId: string, toAccountId: string, amount: number, meta?: any) {
  return transfer(fromAccountId, toAccountId, amount, meta);
}

export function setThreshold(accountId: string, threshold: number) {
  setLowBalanceThreshold(accountId, threshold);
}

export function accountId(ownerType: AccountOwnerType, ownerId: string) {
  return getAccountId(ownerType, ownerId);
}
