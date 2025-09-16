// src/utils/constants.ts

/**
 * Chiavi usate per la persistenza mock su localStorage.
 * Mantiene retro-compatibilità con la versione precedente del file.
 */
export const STORAGE_KEYS = {
  currentUser: "trustup.currentUser",
  identityRegistry: "trustup.identityRegistry",
  creditsLedger: "trustup.creditsLedger",

  // Prodotti (MOCK)
  products: "trustup.products",
  productTypes: "trustup.productTypes",

  // Eventi (MOCK)
  events: "trustup.events",
} as const;

/**
 * Routes principali. Mantiene i path già utilizzati.
 */
export const ROUTES = {
  login: "/login",
  admin: "/admin",
  company: "/company", // Home azienda
  companyTeam: "/company/team", // Gestione membri
  creator: "/creator",
  operator: "/operator",
  machine: "/machine",
} as const;

/**
 * Costi/fees mock dell'applicazione.
 */
export const COSTS = {
  publishVC: 1, // costo (mock) in crediti per emettere un DPP/VC
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
 * Usiamo una tuple literal per ottenere `EventTypeFromConst` come union type
 * senza importare direttamente dai tipi (evita dipendenze circolari).
 *
 * Nota: se modifichi il union type in src/types/event.ts, aggiorna anche qui.
 */
export const EVENT_TYPES = [
  "product.created",
  "product.updated",
  "bom.updated",
  "dpp.published",
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
 */
export const EVENT_STATUSES = ["open", "in_progress", "done"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/* ------------------------------------------------------------------ */
/*                    Ruoli → rotte suggerite (facoltativo)            */
/* ------------------------------------------------------------------ */

/**
 * Mappa di utilità per gestire la redirezione post-login e la sidebar.
 * Non obbligatoria: usala dove ti torna utile.
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
  transfer: "Trasferimento",
  inspection: "Ispezione",
  recycle: "Riciclo",
  custom: "Personalizzato",
};
