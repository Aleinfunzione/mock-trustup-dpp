// src/test/credits.regression.test.ts
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  ensureCompanyAccount,
  ensureMemberAccount,
  getAccountId,
  getBalance,
  setIslandBudget,
  getIslandBudget,
  spend,
  simulate,
  topup,
} from "../stores/creditStore";
import type { ConsumeActor, CreditAction } from "../types/credit";

/* Polyfill minimo per ambiente Node */
class LS {
  private s = new Map<string, string>();
  get length() { return this.s.size; }
  clear(){ this.s.clear(); }
  key(i:number){ return Array.from(this.s.keys())[i] ?? null; }
  getItem(k:string){ return this.s.get(k) ?? null; }
  setItem(k:string,v:string){ this.s.set(k, String(v)); }
  removeItem(k:string){ this.s.delete(k); }
}
beforeAll(() => {
  Object.defineProperty(globalThis, "localStorage", { value: new LS(), configurable: true });
  if (!(globalThis as any).crypto) {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { getRandomValues: (a: Uint8Array) => { for (let i=0;i<a.length;i++) a[i] = Math.floor(Math.random()*256); return a; } },
    });
  }
});
beforeEach(() => (globalThis as any).localStorage.clear());

const rid = (n=6) => Math.random().toString(36).slice(2, 2+n);

describe("credits regression", () => {
  it("payer assegnatario, idempotenza spend, bucket isola", () => {
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
    const sim1 = simulate(A_ASSIGN, actor, 1, { assignedToDid: memberDid }) as any;
    const memberAcc = getAccountId("operator", memberDid);
    expect(sim1.payer).toBe(memberAcc);

    // 2) idempotenza spend
    const eventId = `evt_${rand}`;
    const dedup = `${A_ASSIGN}:${eventId}`;
    const before = getBalance(memberAcc);
    const r1 = spend(A_ASSIGN, actor, { eventId, assignedToDid: memberDid }, 1, dedup) as any;
    const r2 = spend(A_ASSIGN, actor, { eventId, assignedToDid: memberDid }, 1, dedup) as any;
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.tx.id).toBe(r2.tx.id);
    const after = getBalance(memberAcc);
    expect(Math.abs(before - after)).toBe(r1.tx.amount);

    // 3) bucket isola
    const b0 = getIslandBudget(companyId, islandId);
    const r3 = spend(A_EVENT, actor, { islandId }, 1) as any;
    const b1 = getIslandBudget(companyId, islandId);
    expect(r3.ok).toBe(true);
    expect(r3.bucketId).toBe(islandId);
    expect(b1).toBe(b0 - r3.tx.amount);
  });
});
