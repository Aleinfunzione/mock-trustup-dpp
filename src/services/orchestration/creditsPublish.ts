// src/services/orchestration/creditsPublish.ts
import type { ConsumeActor } from "@/types/credit";
import { simulateCost, consumeForAction } from "@/services/api/credits";
import { PRICE_TABLE } from "@/config/creditPolicy";
import * as Orchestrator from "./WorkflowOrchestrator";

type Orch = {
  prepareVP?: (id: string) => any | Promise<any>;
  publishVP?: (id: string) => any | Promise<any>;
  prepareDPP?: (id: string) => any | Promise<any>;
  publishDPP?: (id: string) => any | Promise<any>;
};
const O = Orchestrator as unknown as Orch;

export type ActionCode = keyof typeof PRICE_TABLE;

export class CreditError extends Error {
  code: "INSUFFICIENT_CREDITS" | "CHAIN_BLOCKED" | "POLICY_DENY" | "UNKNOWN";
  details?: unknown;
  constructor(code: CreditError["code"], message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function mapReasonToCode(reason: unknown): CreditError["code"] {
  const r = String(reason ?? "").toUpperCase();
  if (r.includes("INSUFFICIENT")) return "INSUFFICIENT_CREDITS";
  if (r.includes("CHAIN_BLOCKED") || r.includes("CHAIN")) return "CHAIN_BLOCKED";
  if (r.includes("POLICY")) return "POLICY_DENY";
  return "UNKNOWN";
}

function normalize(err: unknown): CreditError {
  const e = err as any;
  const msg = (e?.code || e?.message || e?.reason || "").toString().toUpperCase();
  if (msg.includes("INSUFFICIENT")) return new CreditError("INSUFFICIENT_CREDITS", "Crediti insufficienti", e);
  if (msg.includes("CHAIN_BLOCKED") || msg.includes("CHAIN")) return new CreditError("CHAIN_BLOCKED", "Catena pagatore bloccata", e);
  if (msg.includes("POLICY")) return new CreditError("POLICY_DENY", "Policy crediti nega l’azione", e);
  return new CreditError("UNKNOWN", "Errore crediti", e);
}

function safeQty(qty?: number) {
  return Number.isInteger(qty) && (qty as number) > 0 ? (qty as number) : 1;
}

export function costOf(action: ActionCode, qty = 1): number {
  const unit = PRICE_TABLE[action] ?? 0;
  return unit * safeQty(qty);
}

export async function simulate(action: ActionCode, actor: ConsumeActor, qty = 1): Promise<void> {
  try {
    const _simulate: any = simulateCost as any;
    await _simulate({ action, ...actor, qty: safeQty(qty) });
  } catch (e) {
    throw normalize(e);
  }
}

export async function canAfford(action: ActionCode, actor: ConsumeActor, qty = 1): Promise<boolean> {
  try {
    await simulate(action, actor, qty);
    return true;
  } catch {
    return false;
  }
}

export async function consume(
  action: ActionCode,
  actor: ConsumeActor,
  meta?: Record<string, unknown>,
  qty = 1
): Promise<{ ok: true; tx?: any; payerAccountId?: string } | never> {
  try {
    const _consume: any = consumeForAction as any;
    const res = await _consume(action, actor, meta, safeQty(qty));
    if (res?.ok === false) {
      const code = mapReasonToCode(res?.reason);
      throw new CreditError(code, String(res?.reason ?? "Errore consumo"), res);
    }
    return res;
  } catch (e) {
    throw normalize(e);
  }
}

export async function publishVPWithCredits(productId: string, actor: ConsumeActor) {
  if (O.prepareVP) await O.prepareVP(productId);
  else if (O.prepareDPP) await O.prepareDPP(productId);

  await simulate("VP_PUBLISH", actor);

  const debit = await consume("VP_PUBLISH", actor, { kind: "vp", id: productId });

  const publish = O.publishVP ?? O.publishDPP;
  if (!publish) throw new Error("ORCH_METHOD_MISSING");

  const res = await publish(productId);
  return { ...res, creditTx: (debit as any)?.tx, payerAccountId: (debit as any)?.payerAccountId };
}
