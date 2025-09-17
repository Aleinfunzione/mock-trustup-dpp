// /src/services/schema/loader.ts
// Caricatore di JSON Schema da /public/schemas con caching in-memory.
// Funziona sia con path assoluti ("/schemas/*.json") sia con URL.

const schemaCache = new Map<string, any>();

export async function loadSchema(schemaPath: string): Promise<any> {
  // Cache hit
  if (schemaCache.has(schemaPath)) return schemaCache.get(schemaPath);

  // Per file in /public: passa direttamente "/schemas/..." a fetch()
  const url = schemaPath.startsWith("http") ? schemaPath : schemaPath;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Impossibile caricare schema: ${schemaPath} — ${res.status} ${res.statusText}`
    );
  }

  const json = await res.json();
  schemaCache.set(schemaPath, json);
  return json;
}

export function clearSchemaCache() {
  schemaCache.clear();
}
