// src/types/product.ts
export type ProductId = string;

/** Valore ammesso per gli attributi di compliance */
export type ComplianceValue = string | number | boolean | null | undefined;

/** Nodo BOM (mock) */
export interface BomNode {
  id: string;
  componentRef?: ProductId;
  placeholderName?: string;
  quantity?: number;
  children?: BomNode[];
}

import type { PillInstance } from "@/config/attributeCatalog";

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

  /** opzionali per flusso “attributi di settore” */
  schemaId?: string;
  pills?: PillInstance[];
  guidedAttributes?: Record<string, any>;

  /** VC organizzative collegate al prodotto */
  attachedOrgVCIds?: string[];

  /** attributi di compliance assegnati da CompanyAttributes.compliance */
  complianceAttrs?: Record<string, ComplianceValue>;

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
