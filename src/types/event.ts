// src/types/event.ts

export type EventId = string;

export type EventType =
  | "product.created"
  | "product.updated"
  | "bom.updated"
  | "dpp.published"
  // eventi dedicati alle pillole (catalogo attributi)
  | "product.pill.added"
  | "product.pill.updated"
  | "product.pill.removed"
  // eventi applicativi generici già previsti
  | "transfer"
  | "inspection"
  | "recycle"
  | "custom";

/** Stato base per la UI timeline */
export type EventStatus = "queued" | "in_progress" | "done";

/** Ambito dell’evento rispetto al prodotto */
export type EventScope = "product" | "bom";

/** Metadati target usati in BOM e isole */
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

/** Evento applicativo legato a un prodotto (MOCK) */
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

  /** stato visuale opzionale per timeline */
  status?: EventStatus;

  /** se l’evento è riferito a una specifica isola */
  islandId?: string;

  /** destinatario specifico, se assegnato a membro/macchina */
  assignedToDid?: string;

  /** chi lo ha effettivamente eseguito e quando (se diverso dall’assegnatario) */
  executedByDid?: string;
  executedAt?: string;

  /** payload libero + metadati target standardizzati */
  data?: Record<string, any> & EventTargetMeta;

  /** relazioni opzionali verso altri DID/prodotti/eventi */
  related?: {
    products?: string[];
    actors?: string[];
    events?: string[];
    /** opzionali extra utili in futuro (non rompono nulla) */
    docs?: string[];
    uri?: string;
  };
}

/** Input standard per creazione evento dal service */
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
  data?: Record<string, any> & EventTargetMeta;
  /** stato iniziale */
  status?: EventStatus;
  /** isola riferita */
  islandId?: string;
  /** override del timestamp */
  timestamp?: string;
}

/** Filtri base per interrogazioni */
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
