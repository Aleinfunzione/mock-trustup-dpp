export type AccountOwnerType =
  | "admin"
  | "company"
  | "creator"
  | "operator"
  | "machine";

export type CreditAction =
  | "VC_CREATE"
  | "VP_PUBLISH"
  | "EVENT_CREATE"
  | "ASSIGNMENT_CREATE"
  | "TELEMETRY_PACKET"
  | "MACHINE_AUTOCOMPLETE";

export interface CreditAccount {
  id: string; // es. acc:company:<companyId>
  ownerType: AccountOwnerType;
  ownerId: string;
  balance: number; // interi
  creditLimit?: number;
  lowBalanceThreshold?: number;
  updatedAt: string; // ISO
}

export interface CreditTx {
  id: string;
  ts: string; // ISO
  type: "topup" | "transfer" | "consume" | "refund" | "adjust";
  fromAccountId?: string;
  toAccountId?: string;
  amount: number; // > 0
  action?: CreditAction;
  ref?: { kind: string; id: string };
  meta?: Record<string, any>;
}

export interface SponsorshipRule {
  payerOrder: Array<"actor" | "company" | "admin">;
}

export type PriceTable = Record<CreditAction, number>;
export type SponsorshipPolicy = Record<CreditAction, SponsorshipRule>;

export interface ConsumeActor {
  ownerType: AccountOwnerType;
  ownerId: string;
  companyId?: string;
}

export type ConsumeResultOk = { ok: true; payerAccountId: string; tx: CreditTx };
export type ConsumeResultErr = {
  ok: false;
  reason: "INSUFFICIENT_FUNDS" | "NO_PAYER";
  detail: any;
};
export type ConsumeResult = ConsumeResultOk | ConsumeResultErr;
