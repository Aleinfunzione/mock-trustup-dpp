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

/** Lettura sicura dal localStorage con fallback. */
export function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return parseJSON<T>(raw, fallback);
  } catch {
    return fallback;
  }
}

/** Scrittura sicura nel localStorage. Ignora errori/quota. */
export function safeSet<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value as Json);
    localStorage.setItem(key, serialized);
  } catch {
    // noop
  }
}

/** Rimozione sicura della chiave. */
export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // noop
  }
}

/** Verifica esistenza chiave. */
export function safeExists(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Read–modify–write atomico con seed iniziale.
 * Ritorna il valore aggiornato scritto.
 */
export function safeUpdate<T>(key: string, updater: (prev: T) => T, seed: T): T {
  const prev = safeGet<T>(key, seed);
  const next = updater(prev);
  safeSet<T>(key, next);
  return next;
}

/** Migra contenuto da una chiave legacy a una nuova, se presente. */
export function migrateKey(oldKey: string, newKey: string): void {
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

/** Rimuove tutte le chiavi che iniziano con il prefisso dato. */
export function clearByPrefix(prefix: string): void {
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

/* Alias legacy richiesti da vecchi import */
export const get = safeGet;
export const set = safeSet;
