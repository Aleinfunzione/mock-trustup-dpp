export type ProductId = string;

/** Nodo BOM (mock) */
export interface BomNode {
  /** id univoco del nodo (uuid o random) */
  id: string;
  /** riferimento a un prodotto esistente (alternativa a placeholderName) */
  componentRef?: ProductId;
  /** nome libero se il componente non è ancora registrato */
  placeholderName?: string;
  /** quantità relativa nel BOM */
  quantity?: number;
  /** sotto-componenti */
  children?: BomNode[];
}

export interface Product {
  id: ProductId;
  companyDid: string;
  createdByDid: string;

  name: string;
  sku?: string;

  /** riferimento al Product Type (schema JSON completo validato con AJV) */
  typeId: string;
  /** attributi validati tramite JSON Schema (AJV) */
  attributes: Record<string, any>;

  /** distinta base multilivello */
  bom: BomNode[];

  /** stub per crediti/EPR (MOCK) */
  sponsoredCredits?: number;

  /** pubblicazione DPP (MOCK) */
  isPublished?: boolean;
  dppId?: string;

  /** metadati pubblicazione corrente (MOCK) */
  dppPublishedAt?: string;
  dppPublishedDigest?: string;

  /** metadati della bozza corrente (MOCK) */
  dppDraftUpdatedAt?: string;
  dppDraftDigest?: string;

  /** true se la bozza è più nuova dell’ultimo publish */
  hasNewDraftSincePublish?: boolean;

  createdAt: string;
  updatedAt: string;
}
