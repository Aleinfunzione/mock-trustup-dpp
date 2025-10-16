// src/utils/storage.ts
/**
 * Util per localStorage con tolleranza a errori JSON e retro-compatibilità.
 * Tutti i valori salvati passano da JSON.stringify.
 */

type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [k: string]: Json };

/* ------------------------- availability check ------------------------- */

function storageAvailable(): boolean {
  try {
    const k = "__ls_probe__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/* ----------------------------- JSON parse ----------------------------- */

/** Parser tollerante: gestisce "", "null", "undefined" e valori legacy non-JSON. */
function parseJSON<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  const s = raw.trim();
  if (s === "" || s === "null" || s === "undefined") return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    // Retro-compatibilità: se in passato è stato salvato un plain string.
    if (typeof fallback === "string") return s as unknown as T;
    return fallback;
  }
}

/* ------------------------------ Reads --------------------------------- */

/** Lettura sicura dal localStorage con fallback. */
export function safeGet<T>(key: string, fallback: T): T {
  if (!storageAvailable()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return parseJSON<T>(raw, fallback);
  } catch {
    return fallback;
  }
}

/** Ritorna il valore oppure crea+salva il seed se assente. */
export function safeGetOrSeed<T>(key: string, seed: T): T {
  const v = safeGet<T>(key, seed);
  if (!safeExists(key)) safeSet<T>(key, v);
  return v;
}

/** Verifica esistenza chiave. */
export function safeExists(key: string): boolean {
  if (!storageAvailable()) return false;
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/* ------------------------------ Writes -------------------------------- */

/** Scrittura sicura nel localStorage. Se `value` è `undefined` → remove. */
export function safeSet<T>(key: string, value: T): void {
  if (!storageAvailable()) return;
  try {
    // Se qualcuno passa undefined, rimuoviamo la chiave per evitare setItem con valore non string.
    if (value === undefined) {
      localStorage.removeItem(key);
      return;
    }
    const serialized = JSON.stringify(value as Json);
    localStorage.setItem(key, serialized);
  } catch {
    // noop
  }
}

/** Rimozione sicura della chiave. */
export function safeRemove(key: string): void {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // noop
  }
}

/**
 * Read–modify–write con seed iniziale e piccoli retry.
 * Ritorna il valore aggiornato scritto.
 */
export function safeUpdate<T>(key: string, updater: (prev: T) => T, seed: T, retries = 2): T {
  let prev = safeGet<T>(key, seed);
  let next = updater(prev);
  for (let i = 0; i <= retries; i++) {
    try {
      safeSet<T>(key, next);
      return next;
    } catch {
      prev = safeGet<T>(key, seed);
      next = updater(prev);
    }
  }
  return next;
}

/** Merge shallow su oggetti salvati. */
export function safeMerge<T extends Record<string, any>>(key: string, patch: Partial<T>, seed: T): T {
  const base = safeGet<T>(key, seed);
  const next = { ...(base as any), ...(patch as any) } as T;
  safeSet<T>(key, next);
  return next;
}

/* ------------------------------ Migrate -------------------------------- */

/** Migra contenuto da una chiave legacy a una nuova, se presente. */
export function migrateKey(oldKey: string, newKey: string): void {
  if (!storageAvailable()) return;
  try {
    if (oldKey === newKey) return;
    const raw = localStorage.getItem(oldKey);
    if (raw != null && !safeExists(newKey)) {
      localStorage.setItem(newKey, raw);
    }
    localStorage.removeItem(oldKey);
  } catch {
    // noop
  }
}

/** Migrazione bulk: [[old,new], ...] */
export function migrateKeys(pairs: Array<[string, string]>): void {
  for (const [o, n] of pairs) migrateKey(o, n);
}

/* ------------------------------- Tools --------------------------------- */

/** Rimuove tutte le chiavi che iniziano con il prefisso dato. */
export function clearByPrefix(prefix: string): void {
  if (!storageAvailable()) return;
  try {
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toDelete.push(k);
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
  } catch {
    // noop
  }
}

/** Elenca chiavi che iniziano con prefisso. */
export function keysByPrefix(prefix: string): string[] {
  if (!storageAvailable()) return [];
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(k);
    }
  } catch {
    // noop
  }
  return out;
}

/** Lista {key,value} per prefisso, con parsing sicuro. */
export function listByPrefix<T = unknown>(prefix: string): Array<{ key: string; value: T }> {
  if (!storageAvailable()) return [];
  const keys = keysByPrefix(prefix);
  return keys.map((k) => ({ key: k, value: safeGet<T>(k, undefined as unknown as T) }));
}

/* ------------------------------ Aliases -------------------------------- */

/** Alias legacy richiesti da vecchi import */
export const get = safeGet;
export const set = safeSet;
export const exists = safeExists;
export const remove = safeRemove;
