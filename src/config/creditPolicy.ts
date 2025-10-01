// src/config/creditPolicy.ts
import type {
  PriceTable,
  SponsorshipPolicy,
  CreditAction,
} from "@/types/credit";

/**
 * Prezzi per azione (unità: crediti interi)
 */
export const PRICE_TABLE: PriceTable = Object.freeze({
  VC_CREATE: 3,
  VP_PUBLISH: 5,
  EVENT_CREATE: 1,
  ASSIGNMENT_CREATE: 2,
  TELEMETRY_PACKET: 1,
  MACHINE_AUTOCOMPLETE: 5,
});

/**
 * Politiche di sponsorship e fallback del payer.
 * - actor = l’attore che esegue l’azione (creator/operator/machine)
 * - company = azienda dell’attore
 * - admin = conto master
 */
export const SPONSORSHIP: SponsorshipPolicy = Object.freeze({
  VC_CREATE: { payerOrder: ["company", "admin"] },
  VP_PUBLISH: { payerOrder: ["company", "admin"] },
  EVENT_CREATE: { payerOrder: ["actor", "company", "admin"] },
  ASSIGNMENT_CREATE: { payerOrder: ["actor", "company", "admin"] },
  TELEMETRY_PACKET: { payerOrder: ["actor", "company", "admin"] },
  MACHINE_AUTOCOMPLETE: { payerOrder: ["actor", "company", "admin"] },
});

/**
 * Utility: costo totale per azione * quantità
 */
export function getActionCost(action: CreditAction, qty = 1): number {
  const unit = PRICE_TABLE[action] ?? 0;
  const n = Number.isInteger(qty) && qty > 0 ? qty : 1;
  return unit * n;
}
