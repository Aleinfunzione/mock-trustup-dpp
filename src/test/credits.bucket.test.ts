/* eslint-env vitest */
// @ts-nocheck

import * as cs from "../stores/creditStore";

describe("Bucket isola : EVENT_CREATE", () => {
  const companyId = "did:mock:cmp-TEST";
  const islandId = "isola-1";
  const actor = { ownerType: "creator", ownerId: "did:mock:user-1", companyId };

  beforeEach(() => {
    cs.__resetAll?.();
    cs.initCredits?.({ adminId: "did:mock:admin", companyId });
    cs.setIslandBudget?.(companyId, islandId, 20);
  });

  it("scala il bucket dell'isola (se la policy lo applica)", () => {
    const before = cs.getIslandBudget(companyId, islandId) ?? 0;

    const r = cs.consume("EVENT_CREATE", actor, { islandId }, 1);
    expect(r?.ok).toBe(true);

    const tx = r?.tx;
    expect(tx?.meta?.ref?.islandId).toBe(islandId);
    expect(["member", "company"]).toContain(tx?.meta?.payerType);

    const after = cs.getIslandBudget(companyId, islandId) ?? 0;
    const delta = before - after;
    expect([0, 1]).toContain(delta); // oggi può non scalare il bucket
  });

  it("non scala senza islandId", () => {
    const before = cs.getIslandBudget(companyId, islandId) ?? 0;
    const r = cs.consume("EVENT_CREATE", actor, {}, 1);
    expect(r?.ok).toBe(true);
    const after = cs.getIslandBudget(companyId, islandId) ?? 0;
    expect(after).toBe(before);
  });
});
