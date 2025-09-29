// src/domains/product/entities.ts
// Tipi minimi per prodotto e VC associate.

import type { StandardId } from "@/config/standardsRegistry";
import type { VerifiableCredential } from "@/domains/credential/entities";

export type ProductId = string;

export type Product = {
  id: ProductId;
  companyId: string;
  typeId: string;
  title: string;
};

export type ProductVCMap = Partial<Record<StandardId, VerifiableCredential<any>>>;
