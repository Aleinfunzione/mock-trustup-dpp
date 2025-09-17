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

/** Evento applicativo legato a un prodotto (MOCK) */
export interface ProductEvent {
  id: EventId;
  type: EventType;
  productId: string;
  companyDid: string;
  actorDid: string;
  timestamp: string;
  /** payload libero specifico dell’evento */
  data?: Record<string, any>;
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
