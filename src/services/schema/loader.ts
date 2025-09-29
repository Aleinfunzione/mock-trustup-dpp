// /src/services/schema/loader.ts
// Caricatore di JSON Schema da /public/schemas con caching in-memory.
// Supporta path assoluti ("/schemas/*.json") e URL complete.
// Deduplica richieste concorrenti e permette il bust-cache.

const schemaCache = new Map<string, any>();
const inflight = new Map<string, Promise<any>>();

function resolveKey(schemaPath: string): string {
  // Normalizza la chiave di cache sullo stesso valore usato da fetch
  if (/^https?:\/\//i.test(schemaPath)) return schemaPath;
  // Garantisce leading slash
  const p = schemaPath.startsWith("/") ? schemaPath : `/${schemaPath}`;
  // Con Vite BASE_URL diverso da "/" mantieni URL relativo all'origin
  const base = (typeof import.meta !== "undefined" && (import.meta as any).env?.BASE_URL) || "/";
  // Se già è sotto /schemas, non duplicare il segmento base
  return p.startsWith("/schemas/") ? `${base.replace(/\/$/, "")}${p}` : `${base.replace(/\/$/, "")}${p}`;
}

/**
 * Carica uno schema JSON con cache e deduplica.
 * @param schemaPath Path come "/schemas/foo.json" oppure URL http(s)
 * @param opts.bustCache Se true, ignora la cache per questa richiesta
 */
export async function loadSchema(schemaPath: string, opts?: { bustCache?: boolean }): Promise<any> {
  const key = resolveKey(schemaPath);

  if (!opts?.bustCache && schemaCache.has(key)) return schemaCache.get(key);

  if (inflight.has(key)) return inflight.get(key)!;

  const prom = (async () => {
    const res = await fetch(key, { cache: opts?.bustCache ? "reload" : "no-store" });
    if (!res.ok) {
      throw new Error(`Impossibile caricare schema: ${schemaPath} — ${res.status} ${res.statusText}`);
    }
    // Parsing sicuro
    let json: any;
    try {
      json = await res.json();
    } catch (e) {
      throw new Error(`Schema non è JSON valido: ${schemaPath} — ${(e as Error).message}`);
    }
    schemaCache.set(key, json);
    return json;
  })()
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, prom);
  return prom;
}

export function clearSchemaCache() {
  schemaCache.clear();
}

export function evictSchema(schemaPath: string) {
  schemaCache.delete(resolveKey(schemaPath));
}

export function getSchemaFromCache(schemaPath: string): any | undefined {
  return schemaCache.get(resolveKey(schemaPath));
}
