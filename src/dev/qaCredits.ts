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
  const memberAcc = getAccountId("operator", memberDid);
  topup(memberAcc, 5);
  setIslandBudget(companyId, islandId, 20);

  const actor: ConsumeActor = { ownerType: "company", ownerId: companyId, companyId };
  const A_ASSIGN: CreditAction = "ASSIGNMENT_CREATE";
  const A_EVENT: CreditAction = "EVENT_CREATE";

  // 1) payer assegnatario (simulate: units prima del context)
  const sim1 = simulate(A_ASSIGN, actor, 1, { assignedToDid: memberDid });
  const payerMemberOk = sim1.payer === memberAcc;

  // 2) idempotenza spend
  const eventId = `evt_${rand}`;
  const dedup = `${A_ASSIGN}:${eventId}`;
  const before = getBalance(memberAcc);
  const r1: any = spend(A_ASSIGN, actor, { eventId, assignedToDid: memberDid }, 1, dedup);
  const r2: any = spend(A_ASSIGN, actor, { eventId, assignedToDid: memberDid }, 1, dedup);
  const idemOk = r1?.ok && r2?.ok && r1.tx?.id === r2.tx?.id;
  const after = getBalance(memberAcc);
  const deductedOnceOk = Math.abs(before - after) === (r1?.tx?.amount ?? 0);

  // 3) bucket isola (policy-aware)
  const companyAcc = getAccountId("company", companyId);
  const b0 = getIslandBudget(companyId, islandId) ?? 0;
  const r3: any = spend(A_EVENT, actor, { islandId }, 1);
  const b1 = getIslandBudget(companyId, islandId) ?? 0;
  const delta = b0 - b1;
  const payerType = r3?.tx?.meta?.payerType;
  const refIslandId = r3?.tx?.meta?.ref?.islandId;
  const bucketUsedOk = !!r3?.ok && refIslandId === islandId && (delta === 1 || payerType === "member");

  return {
    idemOk: idemOk && deductedOnceOk,
    payerMemberOk,
    bucketUsedOk,
    balances: { member: getBalance(memberAcc), company: getBalance(companyAcc) },
    bucket: b1,
    debug: { delta, payerType, refIslandId, txId: r3?.tx?.id },
  };
}
