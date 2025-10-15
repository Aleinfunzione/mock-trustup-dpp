// src/utils/constants.ts

/**
 * Chiavi usate per la persistenza mock su localStorage.
 * Mantiene retro-compatibilità con la versione precedente del file.
 */
export const STORAGE_KEYS = {
  // Auth/Identità
  currentUser: "trustup.currentUser",
  identityRegistry: "trustup.identityRegistry",

  // Ledger crediti (legacy – deprecato in favore delle chiavi CREDITS_*)
  creditsLedger: "trustup.creditsLedger",

  // Crediti (nuovo sistema)
  CREDITS_ACCOUNTS: "trustup:credits:accounts",
  CREDITS_TX: "trustup:credits:tx",
  CREDITS_META: "trustup:credits:meta",

  // Prodotti (MOCK)
  products: "trustup.products",
  productTypes: "trustup.productTypes",

  // Eventi (MOCK)
  events: "trustup.events",

  // VC (nuove)
  orgVC: "trustup:vc:org",
  prodVC: "trustup:vc:prod",

  // Snapshot VP/DPP pubblicati
  vpSnapshots: "trustup:vp:snapshots",
} as const;
export type StorageKeys = typeof STORAGE_KEYS;
export type StorageKey = StorageKeys[keyof StorageKeys];

/**
 * Routes principali. Mantiene i path già utilizzati.
 * Aggiunte: viewer pubblico e pagina DPP prodotto.
 */
export const ROUTES = {
  login: "/login",
  admin: "/admin",

  company: "/company", // Home azienda
  companyTeam: "/company/team", // Gestione membri
  companyCompliance: "/company/compliance",
  companyCredentials: "/company/credentials", // opzionale: /company/credentials?std=...

  creator: "/creator",
  creatorProductCredentials: "/creator/products/:id/credentials",

  // Prodotto → DPP/VP
  productDpp: "/products/:id/dpp",

  operator: "/operator",
  machine: "/machine",

  // Viewer pubblico
  viewerVp: "/viewer/:vpId",
} as const;

/**
 * Feature flags letti da env (Vite).
 */
export const FEATURES = {
  CREDENTIALS: import.meta.env.VITE_FEATURE_CREDENTIALS === "true",
  COMPLIANCE: import.meta.env.VITE_FEATURE_COMPLIANCE === "true",
} as const;

/**
 * Soglie low-balance per toast/badge.
 */
export const LOW = {
  ADMIN: 50,
  COMPANY: 20,
  MEMBER: 5,
} as const;

/**
 * Costi/fees mock dell'applicazione.
 * Mantieni `publishVC` per compat. I nuovi kind coprono i consumi mancanti.
 */
export const COSTS = {
  publishVC: 1,              // Emissione DPP/VC
  ASSIGNMENT_CREATE: 1,      // Creazione assegnazione evento
  TELEMETRY_PACKET: 0.1,     // Pacchetto telemetria
  MACHINE_AUTOCOMPLETE: 0.5, // Completamento automatico macchina
} as const;

/* ------------------------------------------------------------------ */
/*                       CATEGORIE / TIPI DI PRODOTTO                  */
/* ------------------------------------------------------------------ */

export type ProductCategory = { id: string; name: string };

/**
 * Configurazione categorie disponibile nella UI.
 * Puoi modificare liberamente nomi/ordine.
 */
export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  { id: "finished_good", name: "Prodotto finito" },
  { id: "component", name: "Componente" },
  { id: "packaging", name: "Packaging" },
  { id: "raw_material", name: "Materia prima" },
] as const;

/**
 * Mappatura Categoria -> lista di typeId consentiti.
 * Nota: manteniamo sempre "generic" così c’è almeno un tipo disponibile.
 * Puoi aggiungere altri typeId (se esistono nello storage).
 */
export const PRODUCT_TYPES_BY_CATEGORY: Readonly<Record<string, string[]>> = {
  finished_good: ["generic"],
  component: ["generic"],
  packaging: ["generic"],
  raw_material: ["generic"],
};

/* ------------------------------------------------------------------ */
/*                             EVENTI (MOCK)                           */
/* ------------------------------------------------------------------ */

/**
 * Tipi di evento supportati (derivati dal tuo union type in src/types/event.ts).
 */
export const EVENT_TYPES = [
  "product.created",
  "product.updated",
  "bom.updated",
  "dpp.published",
  // pillole (catalogo attributi)
  "product.pill.added",
  "product.pill.updated",
  "product.pill.removed",
  // generici
  "transfer",
  "inspection",
  "recycle",
  "custom",
] as const;

/** Union type derivata dalla tuple literal qui sopra. */
export type EventTypeFromConst = (typeof EVENT_TYPES)[number];

/** Helper di runtime per validare un valore come EventType. */
export function isEventType(x: unknown): x is EventTypeFromConst {
  return typeof x === "string" && (EVENT_TYPES as readonly string[]).includes(x);
}

/**
 * Stati evento utilizzati dalla UI (badge, azioni) e dai services.
 * Allineati a src/types/event.ts
 */
export const EVENT_STATUSES = ["queued", "in_progress", "done"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/* ------------------------------------------------------------------ */
/*                    Ruoli → rotte suggerite (facoltativo)            */
/* ------------------------------------------------------------------ */

/**
 * Mappa di utilità per gestire la redirezione post-login e la sidebar.
 */
export const ROLE_ROUTES: Record<
  "admin" | "company" | "creator" | "operator" | "machine",
  string
> = {
  admin: ROUTES.admin,
  company: ROUTES.company,
  creator: ROUTES.creator,
  operator: ROUTES.operator,
  machine: ROUTES.machine,
};

/* ------------------------------------------------------------------ */
/*                      Altre costanti utili (facoltative)             */
/* ------------------------------------------------------------------ */

/** Etichette leggibili per i tipi evento (per Select/Badge). */
export const EVENT_LABELS: Record<EventTypeFromConst, string> = {
  "product.created": "Prodotto creato",
  "product.updated": "Prodotto aggiornato",
  "bom.updated": "BOM aggiornata",
  "dpp.published": "DPP/VC pubblicata",
  "product.pill.added": "Pillola aggiunta",
  "product.pill.updated": "Pillola aggiornata",
  "product.pill.removed": "Pillola rimossa",
  transfer: "Trasferimento",
  inspection: "Ispezione",
  recycle: "Riciclo",
  custom: "Personalizzato",
};
