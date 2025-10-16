// src/types/event.ts

export type EventId = string;

/* =========================
 * Tipi evento
 * ========================= */

export type EventType =
  | "product.created"
  | "product.updated"
  | "bom.updated"
  | "dpp.published"
  // pillole (catalogo attributi)
  | "product.pill.added"
  | "product.pill.updated"
  | "product.pill.removed"
  // generici
  | "transfer"
  | "inspection"
  | "recycle"
  | "custom";

/** Stato base per la UI timeline */
export type EventStatus = "queued" | "in_progress" | "done";

/** Ambito dell’evento rispetto al prodotto */
export type EventScope = "product" | "bom";

/* =========================
 * Metadati target e billing
 * ========================= */

export interface EventTargetMeta {
  scope?: EventScope;
  /** id del nodo BOM se scope="bom" */
  targetNodeId?: string;
  /** path completo fino al nodo BOM */
  targetPath?: string[];
  /** etichetta user-friendly del nodo */
  targetLabel?: string;
  /** isola coinvolta (se evento a livello di isola o se il prodotto è assegnato a un’isola) */
  islandId?: string;
}

export interface EventBilling {
  txId?: string;            // id transazione crediti
  payerAccountId?: string;  // account addebitato
  amount?: number;          // costo applicato
  policy?: string;          // nome/preset policy usata
  chargeKind?: string;      // "consume" | azione specifica
}

/** Payload evento standardizzato + estendibile */
export type EventData = EventTargetMeta & {
  status?: EventStatus;     // opzionale
  notes?: string;
  billing?: EventBilling;   // opzionale, compilato dal service su create
  /** mirror opzionale dell’assegnazione per compat con alcune UI */
  assignedToDid?: string;
  updatedAt?: string;       // ISO
  [k: string]: any;
};

/* =========================
 * Entity principale
 * ========================= */

export interface ProductEvent {
  id: EventId;
  /** consente anche tipi custom non elencati */
  type: EventType | string;

  productId: string;
  companyDid: string;

  /** autore che registra l’evento */
  actorDid: string;

  /** alias per compat con UI: alcuni componenti leggono byDid */
  byDid?: string;

  /** istante creazione; alias createdAt per compat UI */
  timestamp: string;
  createdAt?: string;

  /** stato visuale opzionale per timeline (alias di data.status) */
  status?: EventStatus;

  /** se l’evento è riferito a una specifica isola */
  islandId?: string;

  /** destinatario specifico, se assegnato a membro/macchina */
  assignedToDid?: string;

  /** chi lo ha effettivamente eseguito e quando (se diverso dall’assegnatario) */
  executedByDid?: string;
  executedAt?: string;

  /** payload libero + metadati target standardizzati */
  data?: EventData;

  /** relazioni opzionali verso altri DID/prodotti/eventi */
  related?: {
    products?: string[];
    actors?: string[];
    events?: string[];
    /** opzionali extra utili in futuro */
    docs?: string[];
    uri?: string;
  };
}

/* =========================
 * Input/filtri servizio
 * ========================= */

export interface EventCreateInput {
  productId: string;
  companyDid: string;
  actorDid: string;
  type: EventType | string;

  /** testo libero opzionale */
  notes?: string;

  /** destinatario membro/macchina */
  assignedToDid?: string;

  /** metadati target + payload */
  data?: EventData;

  /** stato iniziale (alias di data.status se presente) */
  status?: EventStatus;

  /** isola riferita */
  islandId?: string;

  /** override del timestamp */
  timestamp?: string;

  /** idempotenza lato billing/store */
  dedupKey?: string;
}

export interface EventUpdateInput {
  id: EventId;
  status?: EventStatus;
  notes?: string;
  assignedToDid?: string;
  data?: Partial<EventData>;
}

export interface EventListFilters {
  productId?: string;
  islandId?: string;
  assignedToDid?: string;
  type?: EventType | string;
  from?: string; // ISO
  to?: string;   // ISO
}

/** Alias usato in alcuni hook/UI */
export type UIEvent = ProductEvent;
