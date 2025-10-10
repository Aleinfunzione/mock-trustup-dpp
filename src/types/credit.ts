// src/types/credit.ts

export type AccountOwnerType =
  | "admin"
  | "company"
  | "creator"
  | "operator"
  | "machine";

/** Azioni a tariffa unitaria */
export type CreditAction =
  | "VC_CREATE"
  | "VP_PUBLISH"
  | "EVENT_CREATE"
  | "ASSIGNMENT_CREATE"
  | "TELEMETRY_PACKET"
  | "MACHINE_AUTOCOMPLETE";

/** Account di addebito/accredito */
export interface CreditAccount {
  id: string;                    // es. acc:company:<companyId>
  ownerType: AccountOwnerType;
  ownerId: string;
  balance: number;               // interi
  creditLimit?: number;
  lowBalanceThreshold?: number;
  updatedAt: string;             // ISO
}

/** Tipi di transazione possibili (include anche le azioni come tipo) */
export type CreditTxType =
  | "topup"
  | "transfer"
  | "consume"
  | "refund"
  | "adjust"
  | CreditAction;

/** Riferimenti standardizzati alle entità correlate */
export type CreditTxRef = {
  kind?: string;
  id?: string;
  productId?: string;
  eventId?: string;
  actorDid?: string;
  islandId?: string;
};

/** Metadati strutturati per log, CSV e UI */
export type CreditTxMeta = {
  actor?: ConsumeActor;
  ref?: CreditTxRef;

  /** Bilanci post-operazione per compat: */
  balance_after?: number;        // saldo del payer dopo l’operazione
  postBalance?: number;          // alias compat
  postBalanceFrom?: number;      // per transfer
  postBalanceTo?: number;        // per transfer

  /** Flag di stato */
  lowBalance?: boolean;
  lowBalanceFrom?: boolean;
  lowBalanceTo?: boolean;
  islandBucketCharged?: boolean;

  /** Idempotenza */
  dedup_key?: string;

  /** Estendibilità */
  [k: string]: any;
};

/** Transazione di crediti */
export interface CreditTx {
  id: string;
  ts: string;                  // ISO
  type: CreditTxType;          // es. "topup" | "transfer" | "ASSIGNMENT_CREATE"
  fromAccountId?: string;
  toAccountId?: string;
  amount: number;              // > 0
  action?: CreditAction;       // valorizzato quando type è generico (es. "consume")
  ref?: CreditTxRef;           // ref rapido legacy (manteniamo per retrocompat)
  meta?: CreditTxMeta;         // payload ricco per UI/CSV
}

/** Policy di sponsorship: ordine di pagamento */
export interface SponsorshipRule {
  payerOrder: Array<"actor" | "company" | "admin">;
}

export type PriceTable = Record<CreditAction, number>;
export type SponsorshipPolicy = Record<CreditAction, SponsorshipRule>;

/** Attore che innesca il consumo */
export interface ConsumeActor {
  ownerType: AccountOwnerType;
  ownerId: string;
  companyId?: string;
}

/** Esiti consumo */
export type ConsumeResultOk = { ok: true; payerAccountId: string; tx: CreditTx };
export type ConsumeResultErr = {
  ok: false;
  reason: "INSUFFICIENT_FUNDS" | "NO_PAYER" | "RACE_CONDITION";
  detail: any;
};
export type ConsumeResult = ConsumeResultOk | ConsumeResultErr;
