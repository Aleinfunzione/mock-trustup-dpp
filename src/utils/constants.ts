// src/utils/constants.ts

/**
 * Chiavi di persistenza su localStorage (mock).
 * Retro-compatibilità garantita.
 */
export const STORAGE_KEYS = {
  /* Auth / Identità */
  currentUser: "trustup.currentUser",
  identityRegistry: "trustup.identityRegistry",

  /* Ledger crediti legacy (deprecato) */
  creditsLedger: "trustup.creditsLedger",

  /* Crediti — nuovo sistema */
  CREDITS_ACCOUNTS: "trustup:credits:accounts",
  CREDITS_TX: "trustup:credits:tx",
  CREDITS_META: "trustup:credits:meta",
  CREDITS_ISLAND_BUCKETS: "trustup:credits:islandBuckets",
  CREDITS_DEDUP: "trustup:credits:dedup",          // idempotenza txRef
  CREDITS_THRESHOLDS: "trustup:credits:thresholds", // soglie low-balance per watcher

  /* Prodotti (mock) */
  products: "trustup.products",
  productTypes: "trustup.productTypes",

  /* Eventi (mock) */
  events: "trustup.events",

  /* Verifiable Credentials (mock) */
  orgVC: "trustup:vc:org",
  prodVC: "trustup:vc:prod",

  /* Snapshot VP/DPP pubblicati */
  vpSnapshots: "trustup:vp:snapshots",
} as const;
export type StorageKeys = typeof STORAGE_KEYS;
export type StorageKey = StorageKeys[keyof StorageKeys];

/** Prefissi utili per operazioni bulk (es. clearByPrefix). */
export const STORAGE_PREFIX = {
  credits: "trustup:credits",
} as const;

/* ------------------------------------------------------------------ */
/*                                ROUTES                               */
/* ------------------------------------------------------------------ */

export const ROUTES = {
  login: "/login",
  admin: "/admin",

  company: "/company",
  companyTeam: "/company/team",
  companyCompliance: "/company/compliance",
  companyCredentials: "/company/credentials",

  creator: "/creator",
  creatorProductCredentials: "/creator/products/:id/credentials",

  productDpp: "/products/:id/dpp",

  operator: "/operator",
  machine: "/machine",

  viewerVp: "/viewer/:vpId",

  dev: "/dev",
} as const;

/* ------------------------------------------------------------------ */
/*                              FEATURES                               */
/* ------------------------------------------------------------------ */

export const FEATURES = {
  CREDENTIALS: import.meta.env.VITE_FEATURE_CREDENTIALS === "true",
  COMPLIANCE: import.meta.env.VITE_FEATURE_COMPLIANCE === "true",
} as const;

/* ------------------------------------------------------------------ */
/*                         Soglie low-balance                          */
/* ------------------------------------------------------------------ */

export const LOW = {
  ADMIN: 50,
  COMPANY: 20,
  MEMBER: 5,
} as const;

/* ------------------------------------------------------------------ */
/*                         Costi mock applicativi                      */
/*  Nota: la policy reale vive in config/creditPolicy.ts               */
/* ------------------------------------------------------------------ */

export const COSTS = {
  publishVC: 1,
  ASSIGNMENT_CREATE: 1,
  TELEMETRY_PACKET: 0.1,
  MACHINE_AUTOCOMPLETE: 0.5,
} as const;

/* ------------------------------------------------------------------ */
/*                     Categorie / Tipi di prodotto                    */
/* ------------------------------------------------------------------ */

export type ProductCategory = { id: string; name: string };

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  { id: "finished_good", name: "Prodotto finito" },
  { id: "component", name: "Componente" },
  { id: "packaging", name: "Packaging" },
  { id: "raw_material", name: "Materia prima" },
] as const;

export const PRODUCT_TYPES_BY_CATEGORY: Readonly<Record<string, string[]>> = {
  finished_good: ["generic"],
  component: ["generic"],
  packaging: ["generic"],
  raw_material: ["generic"],
};

/* ------------------------------------------------------------------ */
/*                                EVENTI                               */
/* ------------------------------------------------------------------ */

export const EVENT_TYPES = [
  "product.created",
  "product.updated",
  "bom.updated",
  "dpp.published",
  "product.pill.added",
  "product.pill.updated",
  "product.pill.removed",
  "transfer",
  "inspection",
  "recycle",
  "custom",
] as const;

export type EventTypeFromConst = (typeof EVENT_TYPES)[number];

export function isEventType(x: unknown): x is EventTypeFromConst {
  return typeof x === "string" && (EVENT_TYPES as readonly string[]).includes(x);
}

export const EVENT_STATUSES = ["queued", "in_progress", "done"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/* ------------------------------------------------------------------ */
/*                         Ruoli → rotte default                       */
/* ------------------------------------------------------------------ */

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
/*                               Etichette                             */
/* ------------------------------------------------------------------ */

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
