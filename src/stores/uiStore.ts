// src/stores/uiStore.ts
// Store UI-agnostico: toast + filtro globale islandId con persistenza.

export type ToastVariant = "default" | "destructive" | "success" | "warning" | "info";

export type ToastMessage = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
};

type Listener = (t: ToastMessage) => void;

const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function pushToast(msg: ToastMessage) {
  for (const l of Array.from(listeners)) {
    try {
      l(msg);
    } catch {
      // no-op
    }
  }
}

// Helpers semantici toast
export function notifySuccess(title: string, description?: string) {
  pushToast({ title, description, variant: "success" });
}
export function notifyInfo(title: string, description?: string) {
  pushToast({ title, description, variant: "info" });
}
export function notifyWarning(title: string, description?: string) {
  pushToast({ title, description, variant: "warning" });
}
export function notifyError(err: unknown, fallback = "Errore") {
  const { title, description, variant } = mapErrorToToast(err, fallback);
  pushToast({ title, description, variant });
}

// ---- Mappatura errori comuni (crediti, policy, rete, AJV) ----
function mapErrorToToast(err: unknown, fallback: string): ToastMessage {
  const e = err as any;
  const code = toUpperStr(e?.code || e?.name || "");
  const msg = toUpperStr(e?.message || "");
  const reason = toUpperStr(e?.reason || "");

  // Crediti
  if (code.includes("INSUFFICIENT") || msg.includes("INSUFFICIENT") || reason.includes("INSUFFICIENT")) {
    return {
      title: "Crediti insufficienti",
      description: "Ricarica o trasferisci crediti per completare l’azione.",
      variant: "destructive",
    };
  }
  if (code.includes("CHAIN_BLOCKED") || msg.includes("CHAIN_BLOCKED")) {
    return {
      title: "Catena pagatore bloccata",
      description: "Verifica policy di sponsorizzazione o account coinvolti.",
      variant: "warning",
    };
  }
  if (code.includes("POLICY") || msg.includes("POLICY")) {
    return {
      title: "Azione negata dalla policy crediti",
      description: "Controlla regole di consumo o limiti configurati.",
      variant: "warning",
    };
  }

  // AJV (validazione schema)
  if (code.includes("AJV") || e?.errors?.[0]?.instancePath || e?.validation?.ajv) {
    const first = e?.errors?.[0];
    const path = first?.instancePath || first?.schemaPath || "";
    return {
      title: "Dati non validi",
      description: compact(`${first?.message ?? "Errore di validazione"}` + (path ? ` (${path})` : "")),
      variant: "destructive",
    };
  }

  // Network/HTTP
  if (code.includes("FETCH") || code.includes("NETWORK") || code.includes("HTTP")) {
    return {
      title: "Errore di rete",
      description: "Riprova più tardi o verifica la connessione.",
      variant: "warning",
    };
  }

  // Fallback
  return {
    title: fallback,
    description: compact(e?.message ?? undefined),
    variant: "destructive",
  };
}

function toUpperStr(v: unknown): string {
  return String(v ?? "").toUpperCase();
}
function compact(s?: string) {
  if (!s) return undefined;
  const t = String(s).trim();
  return t.length ? t : undefined;
}

/* ===================== Filtro globale islandId ===================== */

export type IslandFilterState = {
  enabled: boolean;
  islandId?: string; // se enabled=false, ignorare
};

type IslandListener = (s: IslandFilterState) => void;

const ISLAND_KEY = "trustup:ui:islandFilter";

function readJSON<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // no-op
  }
}

let islandState: IslandFilterState = normalizeIsland(readJSON<ISLANDFilterStored>(ISLAND_KEY, { e: false }));

type ISLANDFilterStored = { e: boolean; id?: string };

function normalizeIsland(stored: ISLANDFilterStored): IslandFilterState {
  const id = typeof stored.id === "string" ? stored.id.trim() : undefined;
  const enabled = !!stored.e && !!id;
  return enabled ? { enabled: true, islandId: id } : { enabled: false, islandId: undefined };
}

function persistIsland() {
  const stored: ISLANDFilterStored = { e: !!islandState.enabled, id: islandState.islandId || undefined };
  writeJSON(ISLAND_KEY, stored);
}

const islandListeners = new Set<IslandListener>();

function emitIsland() {
  for (const l of Array.from(islandListeners)) {
    try {
      l({ ...islandState });
    } catch {
      // no-op
    }
  }
}

/** Stato corrente (clonato). */
export function getIslandFilter(): IslandFilterState {
  return { ...islandState };
}

/** Imposta islandId e abilita. Passa stringa vuota/undefined per disabilitare. */
export function setIslandId(id?: string) {
  const trimmed = (id || "").trim();
  if (!trimmed) {
    islandState = { enabled: false, islandId: undefined };
  } else {
    islandState = { enabled: true, islandId: trimmed };
  }
  persistIsland();
  emitIsland();
}

/** Abilita/disabilita mantenendo l’ultimo islandId. */
export function setIslandEnabled(enabled: boolean) {
  islandState = enabled && islandState.islandId ? { enabled: true, islandId: islandState.islandId } : { enabled: false };
  persistIsland();
  emitIsland();
}

/** Imposta stato completo. */
export function setIslandFilter(next: Partial<IslandFilterState>) {
  const id = typeof next.islandId === "string" ? next.islandId.trim() : islandState.islandId;
  const enabled = next.enabled ?? islandState.enabled;
  setIslandId(enabled ? id : undefined);
}

/** Disabilita e pulisce. */
export function clearIslandFilter() {
  islandState = { enabled: false, islandId: undefined };
  persistIsland();
  emitIsland();
}

/** Subscribe agli aggiornamenti del filtro isola. */
export function subscribeIsland(listener: IslandListener): () => void {
  islandListeners.add(listener);
  // push immediato
  try {
    listener({ ...islandState });
  } catch {}
  return () => islandListeners.delete(listener);
}

// sync tra tab
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === ISLAND_KEY) {
      const stored = readJSON<ISLANDFilterStored>(ISLAND_KEY, { e: false });
      islandState = normalizeIsland(stored);
      emitIsland();
    }
  });
}

/** Utility: applica filtro a una lista di oggetti che hanno islandId. */
export function filterByIsland<T extends { islandId?: string }>(list: T[]): T[] {
  if (!islandState.enabled || !islandState.islandId) return list;
  const id = islandState.islandId;
  return (list || []).filter((x) => (x as any)?.islandId === id || (x as any)?.data?.islandId === id);
}
