// src/services/orchestration/creditsPublish.ts
import type { ConsumeActor } from "@/types/credit";
import { consumeForAction } from "@/services/api/credits";
import * as Orchestrator from "./WorkflowOrchestrator";

type Orch = {
  prepareVP?: (id: string) => any | Promise<any>;
  publishVP?: (id: string) => any | Promise<any>;
  prepareDPP?: (id: string) => any | Promise<any>;
  publishDPP?: (id: string) => any | Promise<any>;
};
const O = Orchestrator as unknown as Orch;

// type guard errore
function isErr<T extends { ok: boolean }>(
  r: T
): r is T & { ok: false; reason?: unknown } {
  return r.ok === false;
}

export async function publishVPWithCredits(productId: string, actor: ConsumeActor) {
  if (O.prepareVP) await O.prepareVP(productId);
  else if (O.prepareDPP) await O.prepareDPP(productId);

  const debit = consumeForAction("VP_PUBLISH", actor, { kind: "vp", id: productId });
  if (isErr(debit)) {
    const reason = String(debit.reason ?? "UNKNOWN");
    throw new Error(`CREDITS_${reason}`);
  }

  const publish = O.publishVP ?? O.publishDPP;
  if (!publish) throw new Error("ORCH_METHOD_MISSING");

  const res = await publish(productId);
  return { ...res, creditTx: debit.tx, payerAccountId: debit.payerAccountId };
}
