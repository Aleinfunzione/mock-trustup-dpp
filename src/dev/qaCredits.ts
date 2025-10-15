// src/dev/qaCredits.ts
import {
  ensureCompanyAccount,
  ensureMemberAccount,
  setIslandBudget,
  getIslandBudget,
  getAccountId,
  getBalance,
  topup,
  spend,
  simulate,
} from "@/stores/creditStore";
import type { ConsumeActor, CreditAction } from "@/types/credit";

function rid(n = 6) {
  return Math.random().toString(36).slice(2, 2 + n);
}

export async function runAll() {
  const rand = rid();
  const companyId = `did:mock:cmp-${rand}`;
  const memberDid = `did:mock:op-${rand}`;
  const islandId = `isl_${rand}`;

  // setup
  ensureCompanyAccount(companyId, 500, 20);
  ensureMemberAccount("operator", memberDid, 0, 5);
  topup(getAccountId("operator", memberDid), 5);
  setIslandBudget(companyId, islandId, 20);

  const actor: ConsumeActor = { ownerType: "company", ownerId: companyId, companyId };
  const A_ASSIGN: CreditAction = "ASSIGNMENT_CREATE";
  const A_EVENT: CreditAction = "EVENT_CREATE";

  // 1) payer assegnatario
  const sim1 = simulate(A_ASSIGN, actor, 1, { assignedToDid: memberDid });
  const memberAcc = getAccountId("operator", memberDid);
  const payerMemberOk = sim1.payer === memberAcc;

  // 2) idempotenza spend
  const eventId = `evt_${rand}`;
  const dedup = `${A_ASSIGN}:${eventId}`;
  const before = getBalance(memberAcc);
  const r1 = spend(A_ASSIGN, actor, { eventId, assignedToDid: memberDid }, 1, dedup);
  const r2 = spend(A_ASSIGN, actor, { eventId, assignedToDid: memberDid }, 1, dedup);
  const idemOk = (r1 as any).ok && (r2 as any).ok && (r1 as any).tx.id === (r2 as any).tx.id;
  const after = getBalance(memberAcc);
  const deductedOnceOk = Math.abs(before - after) === (r1 as any).tx.amount;

  // 3) bucket isola
  const companyAcc = getAccountId("company", companyId);
  const b0 = getIslandBudget(companyId, islandId);
  const r3 = spend(A_EVENT, actor, { islandId }, 1);
  const b1 = getIslandBudget(companyId, islandId);
  const bucketUsedOk = (r3 as any).ok && (r3 as any).bucketId === islandId && b1 === b0 - (r3 as any).tx.amount;

  return {
    idemOk: idemOk && deductedOnceOk,
    payerMemberOk,
    bucketUsedOk,
    balances: { member: getBalance(memberAcc), company: getBalance(companyAcc) },
    bucket: b1,
  };
}
