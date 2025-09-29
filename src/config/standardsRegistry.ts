// src/config/standardsRegistry.ts
// Registro degli standard con metadati e percorso schema pubblico.
// Usato da services/schema/loader.ts → loadStandardSchema()

export type StandardId =
  | "ISO9001"
  | "ISO14001"
  | "TUV"
  | "GS1"
  | "EU_DPP_TEXTILE"
  | "EU_DPP_ELECTRONICS";

export type StandardScope = "organization" | "product";

export type StandardMeta = {
  id: StandardId;
  title: string;
  scope: StandardScope;
  version: string;      // usata per query ?v= e cache-busting
  schemaPath: string;   // relativo a /public (es. "/schemas/organization/iso9001.json")
  requiredFields: string[];
};

export const StandardsRegistry: Record<StandardId, StandardMeta> = {
  ISO9001: {
    id: "ISO9001",
    title: "ISO 9001 — Quality Management",
    scope: "organization",
    version: "1.0",
    schemaPath: "/schemas/organization/iso9001.json",
    requiredFields: ["certificationNumber", "issuingBody", "validFrom", "validUntil"],
  },
  ISO14001: {
    id: "ISO14001",
    title: "ISO 14001 — Environmental Management",
    scope: "organization",
    version: "1.0",
    schemaPath: "/schemas/organization/iso14001.json",
    requiredFields: ["certificationNumber", "issuingBody", "validFrom", "validUntil"],
  },
  TUV: {
    id: "TUV",
    title: "TÜV Certification",
    scope: "organization",
    version: "1.0",
    schemaPath: "/schemas/organization/tuv.json",
    requiredFields: ["certificationNumber", "testStandard", "validUntil"],
  },
  GS1: {
    id: "GS1",
    title: "GS1 Product Identification",
    scope: "product",
    version: "1.0",
    schemaPath: "/schemas/product/gs1.json",
    requiredFields: ["gtin", "productName", "brandName", "manufacturerName"],
  },
  EU_DPP_TEXTILE: {
    id: "EU_DPP_TEXTILE",
    title: "EU DPP — Textile",
    scope: "product",
    version: "1.0",
    schemaPath: "/schemas/product/eu_dpp_textile.json",
    requiredFields: ["fiberComposition", "countryOfOrigin", "recyclability"],
  },
  EU_DPP_ELECTRONICS: {
    id: "EU_DPP_ELECTRONICS",
    title: "EU DPP — Electronics",
    scope: "product",
    version: "1.0",
    schemaPath: "/schemas/product/eu_dpp_electronics.json",
    requiredFields: ["energyLabel", "hazardousSubstances", "repairabilityScore"],
  },
};

// Helper opzionali
export const getStandardsByScope = (scope: StandardScope) =>
  Object.values(StandardsRegistry).filter(s => s.scope === scope);

export const isStandardId = (id: string): id is StandardId =>
  Object.prototype.hasOwnProperty.call(StandardsRegistry, id);
