export type EventId = string

export type EventType =
  | "product.created"
  | "product.updated"
  | "bom.updated"
  | "dpp.published"
  | "transfer"
  | "inspection"
  | "recycle"
  | "custom"

/** Evento applicativo legato a un prodotto (MOCK) */
export interface ProductEvent {
  id: EventId
  type: EventType
  productId: string
  companyDid: string
  actorDid: string
  timestamp: string
  /** payload libero specifico dell’evento */
  data?: Record<string, any>
  /** relazioni opzionali verso altri DID/prodotti/eventi */
  related?: {
    products?: string[]
    actors?: string[]
    events?: string[]
  }
}
