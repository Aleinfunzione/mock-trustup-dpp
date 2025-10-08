// src/services/schema/loader.ts
// Caricatore di JSON Schema da /public/schemas con caching in-memory.
// - Path assoluti/relativi/URL http(s)
// - Deduplica richieste concorrenti
// - Bust-cache + version (?v=)
// - Integrazione StandardsRegistry
// - Prefetch multiplo e on-idle
// - Statistiche cache

import type { StandardId } from "@/config/standardsRegistry";
import { StandardsRegistry } from "@/config/standardsRegistry";

type LoaderOptions = {
  bustCache?: boolean;
  version?: string | number;
  signal?: AbortSignal;
  expectId?: string;
};

const schemaCache = new Map<string, any>();
const inflight = new Map<string, Promise<any>>();

function baseUrl(): string {
  const b =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.BASE_URL) ||
    "/";
  return b.endsWith("/") ? b.slice(0, -1) : b;
}

function normalizePath(p: string): string {
  if (/^https?:\/\//i.test(p)) return p;
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  return `${baseUrl()}${withSlash}`;
}

function applyVersion(url: string, version?: string | number): string {
  if (!version) return url;
  const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  u.searchParams.set("v", String(version));
  return u.toString();
}

function cacheKey(schemaPath: string, version?: string | number): string {
  const url = normalizePath(schemaPath);
  return version ? `${url}::v=${version}` : url;
}

/** Controllo minimo che ciò che abbiamo caricato "somigli" a uno JSON Schema */
function assertSchemaLike(json: any, opts?: LoaderOptions) {
  if (typeof json !== "object" || json == null) {
    throw new Error("Schema caricato non è un oggetto");
  }
  if (json.$schema && typeof json.$schema !== "string") {
    throw new Error("Campo $schema non valido");
  }
  if (opts?.expectId && json.$id && json.$id !== opts.expectId) {
    throw new Error(`$id schema diverso da expectId: ${json.$id} !== ${opts.expectId}`);
  }
}

/** Carica uno schema JSON con cache e deduplica. */
export async function loadSchema(schemaPath: string, opts?: LoaderOptions): Promise<any> {
  const url = normalizePath(schemaPath);
  const urlWithV = applyVersion(url, opts?.version);
  const key = cacheKey(schemaPath, opts?.version);

  if (!opts?.bustCache && schemaCache.has(key)) return schemaCache.get(key);
  if (inflight.has(key)) return inflight.get(key)!;

  const prom = (async () => {
    const res = await fetch(urlWithV, {
      cache: opts?.bustCache ? "reload" : "no-store",
      signal: opts?.signal,
    });
    if (!res.ok) {
      throw new Error(`Impossibile caricare schema: ${schemaPath} — ${res.status} ${res.statusText}`);
    }
    let json: any;
    try {
      json = await res.json();
    } catch (e) {
      throw new Error(`Schema non è JSON valido: ${schemaPath} — ${(e as Error).message}`);
    }
    assertSchemaLike(json, opts);
    schemaCache.set(key, json);
    return json;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, prom);
  return prom;
}

/** Carica lo schema associato a uno StandardId dal Registry. */
export async function loadStandardSchema(standardId: StandardId, opts?: Omit<LoaderOptions, "version">): Promise<any> {
  const std = StandardsRegistry[standardId];
  if (!std) throw new Error(`Standard non registrato: ${standardId}`);
  return loadSchema(std.schemaPath, { ...opts, version: std.version });
}

/** Prefetch concorrente di più schemi. Ignora errori singoli se ignoreErrors=true. */
export async function prefetchSchemas(
  entries: Array<{ path?: string; standardId?: StandardId; version?: string | number }>,
  ignoreErrors = false
): Promise<void> {
  const tasks = entries.map(async (e) => {
    try {
      if (e.standardId) {
        const std = StandardsRegistry[e.standardId];
        if (!std) throw new Error(`Standard non registrato: ${e.standardId}`);
        await loadSchema(std.schemaPath, { version: e.version ?? std.version });
      } else if (e.path) {
        await loadSchema(e.path, { version: e.version });
      }
    } catch (err) {
      if (!ignoreErrors) throw err;
    }
  });
  await Promise.all(tasks);
}

/** Elenco completo dal registry, utile per prefetch. */
export function registryPrefetchEntries(): Array<{ standardId: StandardId; version?: string | number }> {
  // StandardsRegistry è un record {id -> {schemaPath, version}}
  return Object.keys(StandardsRegistry).map((id) => ({
    standardId: id as StandardId,
    version: (StandardsRegistry as any)[id]?.version,
  }));
}

/** Prefetch di tutti gli standard registrati. */
export async function prefetchRegistrySchemas(ignoreErrors = true): Promise<void> {
  const entries = registryPrefetchEntries();
  await prefetchSchemas(entries, ignoreErrors);
}

/** Schedula il prefetch on-idle. Ritorna funzione di cancel. */
export function prefetchOnIdle(
  entries: Array<{ path?: string; standardId?: StandardId; version?: string | number }> = registryPrefetchEntries(),
  ignoreErrors = true,
  timeout = 3000
): () => void {
  let cancelled = false;

  const run = () => {
    if (cancelled) return;
    void prefetchSchemas(entries, ignoreErrors);
  };

  if (typeof window !== "undefined" && (window as any).requestIdleCallback) {
    const h = (window as any).requestIdleCallback(run, { timeout });
    return () => {
      cancelled = true;
      (window as any).cancelIdleCallback?.(h);
    };
  } else {
    const t = setTimeout(run, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }
}

/** Svuota completamente la cache in-memory. */
export function clearSchemaCache() {
  schemaCache.clear();
  inflight.clear();
}

/** Rimuove una singola voce di cache. */
export function evictSchema(schemaPath: string, version?: string | number) {
  schemaCache.delete(cacheKey(schemaPath, version));
}

/** Legge una voce dalla cache. */
export function getSchemaFromCache(schemaPath: string, version?: string | number): any | undefined {
  return schemaCache.get(cacheKey(schemaPath, version));
}

/** Statistiche cache utili per debug. */
export function getSchemaCacheStats() {
  return {
    size: schemaCache.size,
    inflight: inflight.size,
    keys: Array.from(schemaCache.keys()),
  };
}
