// src/types/credit.ts

/* =========================
 * Tipi base
 * ========================= */

export type AccountOwnerType =
  | "admin"
  | "company"
  | "creator"
  | "operator"
  | "machine";

/** Azioni correnti */
export type CreditAction =
  | "VC_CREATE"
  | "VP_PUBLISH"
  | "EVENT_CREATE"
  | "ASSIGNMENT_CREATE"
  | "TELEMETRY_PACKET"
  | "MACHINE_AUTOCOMPLETE";

/** Alias legacy mantenuto per compatibilità */
export type LegacyCreditAction = "publishVC";

/** Azione accettata da policy/prezzi/store */
export type AnyCreditAction = CreditAction | LegacyCreditAction;

/* =========================
 * Account e ledger
 * ========================= */

export interface CreditAccount {
  id: string;                    // es. acc:company:<companyId> | acc:island:<companyId>:<islandId>
  ownerType: AccountOwnerType;
  ownerId: string;               // id logico dell’owner (companyId, userId, ecc.)
  balance: number;               // interi (unità di credito)
  creditLimit?: number;
  lowBalanceThreshold?: number;
  updatedAt: string;             // ISO
}

/** Tipi di transazione (include azioni come tipo) */
export type CreditTxType =
  | "topup"
  | "transfer"
  | "consume"
  | "refund"
  | "adjust"
  | AnyCreditAction;

export type CreditTxRef = {
  kind?: string;
  id?: string;
  productId?: string;
  eventId?: string;
  actorDid?: string;
  islandId?: string;
};

export interface ConsumeActor {
  ownerType: AccountOwnerType;
  ownerId: string;
  companyId?: string;
}

/** Metadati strutturati per UI/CSV */
export type CreditTxMeta = {
  actor?: ConsumeActor;
  ref?: CreditTxRef;

  balance_after?: number;        // compat
  postBalance?: number;          // compat
  postBalanceFrom?: number;      // transfer
  postBalanceTo?: number;        // transfer

  lowBalance?: boolean;
  lowBalanceFrom?: boolean;
  lowBalanceTo?: boolean;
  islandBucketCharged?: boolean;

  dedup_key?: string;

  [k: string]: any;
};

export interface CreditTx {
  id: string;
  ts: string;                  // ISO
  type: CreditTxType;          // "topup" | "transfer" | "consume" | azione specifica
  fromAccountId?: string;
  toAccountId?: string;
  amount: number;              // > 0
  action?: AnyCreditAction;    // valorizzato quando type è generico (es. "consume")
  ref?: CreditTxRef;
  meta?: CreditTxMeta;
}

/* =========================
 * Prezzi e policy
 * ========================= */

/** Slot di pagamento in ordine di priorità */
export type PayerSlot =
  | "assignee"         // account dell’assegnatario (se presente)
  | "actor"            // account di chi innesca l’azione
  | "company_island"   // bucket isola dell’azienda
  | "company"          // account aziendale
  | "admin";           // fallback admin

/** Regola di sponsorship: ordine dei payer */
export interface SponsorshipRule {
  payerOrder: PayerSlot[];
}

/** Tabella prezzi; parziale per consentire override per-azione */
export type PriceTable = Partial<Record<AnyCreditAction, number>>;

/** Mappa di sponsorship; parziale per override granulari */
export type SponsorshipPolicy = Partial<Record<AnyCreditAction, SponsorshipRule>>;

/** Regole di addebito aggiuntive per azione */
export interface ChargePolicyRule {
  /** Se true, tenta prima il bucket isola quando applicabile. */
  preferIslandBucket?: boolean;
  /** Se true, nega l’addebito se non esiste islandId nel contesto. */
  requireIslandId?: boolean;
  /** Finestra idempotenza in secondi per dedup (facoltativa). */
  idempotencyWindowSec?: number;
}

/** Policy di addebito per azione; parziale, opzionale */
export type ChargePolicy = Partial<Record<AnyCreditAction, ChargePolicyRule>>;

/* =========================
 * Esiti consumo e simulazione
 * ========================= */

export type ConsumeResultOk = {
  ok: true;
  payerAccountId: string;
  tx: CreditTx;
};

export type ConsumeResultErr = {
  ok: false;
  reason:
    | "INSUFFICIENT_FUNDS"
    | "NO_PAYER"
    | "POLICY_DENY"
    | "CHAIN_BLOCKED"
    | "RACE_CONDITION";
  detail?: any;
};

export type ConsumeResult = ConsumeResultOk | ConsumeResultErr;

export type SimulateCostOk = {
  ok: true;
  action: AnyCreditAction;
  cost: number;
  /** Anteprima dei candidati payer in ordine di priorità risolto. */
  payerCandidates: string[]; // accountId[]
  usedPolicy?: SponsorshipRule;
  usedCharge?: ChargePolicyRule;
};

export type SimulateCostErr = {
  ok: false;
  reason: "NO_PAYER" | "POLICY_DENY" | "CHAIN_BLOCKED";
  detail?: any;
};

export type SimulateCostResult = SimulateCostOk | SimulateCostErr;
