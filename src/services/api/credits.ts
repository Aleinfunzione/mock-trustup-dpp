// src/services/api/credits.ts
import {
  getAccountId,
  getBalance,
  ensureAccounts,
  simulate,
  consume,
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

/** Bootstrap/ensure accounts. Idempotente. */
export function initCredits(seed: InitSeed) {
  ensureAccounts({
    adminId: seed.adminId,
    companyIds: seed.companyIds,
    memberIds: seed.members,
    defaults: seed.defaults,
  });
}

/** Bilanci multipli. */
export function getBalances(accountIds: string[]) {
  return accountIds.map((id) => ({ id, balance: getBalance(id), low: isLowBalance(id) }));
}

/** Simulazione costo+payer. */
export function simulateCost(action: CreditAction, actor: ConsumeActor, qty = 1) {
  return simulate(action, actor, qty);
}

/** Type guard per ramo errore. */
function isErr(res: _ConsumeResult): res is Extract<_ConsumeResult, { ok: false }> {
  return res.ok === false;
}

/** Consumo crediti per azione. */
export function consumeForAction(
  action: CreditAction,
  actor: ConsumeActor,
  ref?: { kind: string; id: string },
  qty = 1
): { ok: true; tx: CreditTx; payerAccountId: string } | { ok: false; reason: string; detail?: any } {
  const res = consume(action, actor, ref, qty);
  if (isErr(res)) return { ok: false, reason: String(res.reason), detail: res.detail };
  return { ok: true, tx: res.tx, payerAccountId: res.payerAccountId };
}

/** Storico transazioni. */
export function listTransactions(params?: { accountId?: string; limit?: number }) {
  return history(params);
}

/** Top-up account. */
export function topupAccount(toAccountId: string, amount: number, meta?: any) {
  return topup(toAccountId, amount, meta);
}

/** Transfer tra account. */
export function transferBetween(fromAccountId: string, toAccountId: string, amount: number, meta?: any) {
  return transfer(fromAccountId, toAccountId, amount, meta);
}

/** Soglia low-balance. */
export function setThreshold(accountId: string, threshold: number) {
  setLowBalanceThreshold(accountId, threshold);
}

/** Helper accountId. */
export function accountId(ownerType: AccountOwnerType, ownerId: string) {
  return getAccountId(ownerType, ownerId);
}
