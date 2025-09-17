// /src/config/attributeCatalog.ts
// Registry del Catalogo Attributi usato per generare form dinamici (JSON Schema)
// e costruire il credentialSubject { gs1, iso, euDpp } del DPP.
// Mock-first, nessun backend. Compatibile con RJSF + AJV.

// ──────────────────────────────────────────────────────────────────────────────
// Tipi di base
// ──────────────────────────────────────────────────────────────────────────────
export type Standard = 'GS1' | 'ISO' | 'EU-DPP';
export type Namespace = 'gs1' | 'iso' | 'euDpp';

export type AttributeCatalogEntry = {
  /** ID univoco e versionato (es. "eu-dpp-base@1.0") */
  id: string;
  /** Titolo leggibile (UI) */
  title: string;
  /** Standard di riferimento (filtro UX) */
  standard: Standard;
  /** Versione logica dello schema (non semver rigido) */
  version: string; // es. "1.0"
  /** Namespace di destinazione nell’aggregato DPP */
  namespace: Namespace;
  /** Percorso allo schema JSON sotto /public/schemas (o URL assoluto) */
  schemaPath: string;
  /** Opzionale: nome icona (lucide), asset, ecc. */
  icon?: string;
  /** Opzionale: descrizione breve per tooltip/lista */
  description?: string;
};

// ──────────────────────────────────────────────────────────────────────────────
/** Catalogo iniziale (Fase 0): 3 voci */
// ──────────────────────────────────────────────────────────────────────────────
export const ATTRIBUTE_CATALOG: readonly AttributeCatalogEntry[] = Object.freeze([
  {
    id: 'eu-dpp-base@1.0',
    title: 'EU-DPP Base (UNTP-like)',
    standard: 'EU-DPP',
    version: '1.0',
    namespace: 'euDpp',
    schemaPath: '/schemas/dpp_base.v1.json',
    description: 'Identificazione prodotto, classificazioni, facility, traceability refs.'
  },
  {
    id: 'gs1-electronics@1.0',
    title: 'GS1 — Elettronica',
    standard: 'GS1',
    version: '1.0',
    namespace: 'gs1',
    schemaPath: '/schemas/gs1_electronics.v1.json',
    description: 'GTIN, brand, model, dimensions (UNECE), countryOfOrigin.'
  },
  {
    id: 'iso-14001@1.0',
    title: 'ISO 14001 — Certificazione Org.',
    standard: 'ISO',
    version: '1.0',
    namespace: 'iso',
    schemaPath: '/schemas/iso_14001_certificate.v1.json',
    description: 'issuerBody, certificateNumber, validFrom/validTo, evidenceLink.'
  }
] as const);

// ──────────────────────────────────────────────────────────────────────────────
// Tipi per le “pillole” (istanze di attributi compilate via form)
// ──────────────────────────────────────────────────────────────────────────────
export type PillInstance = {
  /** UUID locale della pillola */
  id: string;
  /** ID catalogo (con versione), es. "eu-dpp-base@1.0" */
  catalogId: AttributeCatalogEntry['id'];
  /** Namespace in cui confluirà questa pillola nell’aggregato DPP */
  namespace: Namespace;
  /** Versione copia-incollata dalla voce di catalogo */
  version: AttributeCatalogEntry['version'];
  /** Dati compilati conformi allo schema JSON */
  data: Record<string, any>;
  /** Timestamps (ISO string) */
  createdAt: string;
  updatedAt?: string;
  /** Errori di validazione (AJV) mappati in stringhe leggibili per la UI */
  errors?: string[];
};

// ──────────────────────────────────────────────────────────────────────────────
// Helper opzionali (comodi per UI/servizi)
// ──────────────────────────────────────────────────────────────────────────────
export function getCatalogById(id: string): AttributeCatalogEntry | undefined {
  return ATTRIBUTE_CATALOG.find((e) => e.id === id);
}

export function listByStandard(standard: Standard | 'ALL' = 'ALL'): AttributeCatalogEntry[] {
  return ATTRIBUTE_CATALOG.filter((e) => standard === 'ALL' || e.standard === standard);
}

export function listByNamespace(ns: Namespace): AttributeCatalogEntry[] {
  return ATTRIBUTE_CATALOG.filter((e) => e.namespace === ns);
}
