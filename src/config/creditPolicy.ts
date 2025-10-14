// src/config/creditPolicy.ts
import type { PriceTable, SponsorshipPolicy, CreditAction } from "@/types/credit";

/** Prezzi per azione (crediti) – interi, coerenti con creditStore.consume */
export const PRICE_TABLE: PriceTable = {
  VC_CREATE: 3,
  VP_PUBLISH: 5,
  EVENT_CREATE: 1,
  ASSIGNMENT_CREATE: 2,
  TELEMETRY_PACKET: 1,
  MACHINE_AUTOCOMPLETE: 5,
} as const;

/**
 * Politiche di sponsorship e fallback del payer.
 * - actor = l’attore che esegue l’azione (creator/operator/machine)
 * - company = azienda dell’attore
 * - admin = conto master
 */
export const SPONSORSHIP: SponsorshipPolicy = {
  VC_CREATE: { payerOrder: ["company", "admin"] },
  VP_PUBLISH: { payerOrder: ["company", "admin"] },
  EVENT_CREATE: { payerOrder: ["actor", "company", "admin"] },
  ASSIGNMENT_CREATE: { payerOrder: ["actor", "company", "admin"] },
  TELEMETRY_PACKET: { payerOrder: ["actor", "company", "admin"] },
  MACHINE_AUTOCOMPLETE: { payerOrder: ["actor", "company", "admin"] },
} as const;

/** Alias legacy */
export const sponsorshipChain = SPONSORSHIP;

/** Seed iniziali configurabili */
export const ADMIN_INITIAL_CREDITS = 1000;
export const COMPANY_DEFAULT_CREDITS = 100;

/** Soglia “low balance” di default */
export const LOW_BALANCE_THRESHOLD = 10;

/** Costo totale (forzato a intero, come in consume) */
export function getActionCost(action: CreditAction, qty = 1): number {
  const unitRaw = PRICE_TABLE[action] ?? 0;
  const unit = Number.isFinite(unitRaw as number) ? Math.floor(unitRaw as number) : 0;
  const n = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
  return unit * n;
}

/** Regola di addebito configurabile: isola > attore > fallback */
export type ChargePolicy = {
  /** Se presente islandId e bucket isola capiente, usa account company e scala dal bucket. */
  preferIsland?: boolean;
  /** Se presente assignedToDid e saldo sufficiente, addebita l’attore assegnato. */
  preferActor?: boolean;
  /** Catena di fallback quando i preferiti non possono pagare. */
  fallbackOrder?: ("actor" | "company" | "admin")[];
};

/** Default: isola → attore → company → admin */
export const CHARGE_POLICY: ChargePolicy = {
  preferIsland: true,
  preferActor: true,
  fallbackOrder: ["actor", "company", "admin"],
};
