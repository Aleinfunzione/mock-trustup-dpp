// src/services/crypto/canonicalize.ts
// Canonicalizzazione deterministica JSON per firma/verifica VC/VP.
// - Ordina le chiavi degli oggetti in modo lessicografico (UTF-16).
// - Esclude valori undefined e funzioni.
// - Mantiene l'ordine degli array.
// - Converte Date in ISO string.
// - Serializza numeri finiti e stringhe così come sono.

type JSONPrimitive = string | number | boolean | null;
type JSONValue = JSONPrimitive | JSONArray | JSONObject;
interface JSONArray extends Array<JSONValue> {}
interface JSONObject { [key: string]: JSONValue; }

/** Rimuove undefined e funzioni, converte Date in stringa ISO. */
function sanitize(value: any): JSONValue {
  if (value === null) return null;
  const t = typeof value;
  if (t === "string" || t === "boolean") return value as JSONPrimitive;
  if (t === "number") {
    if (!Number.isFinite(value)) throw new Error("Numero non finito nella canonicalizzazione");
    return value as JSONPrimitive;
  }
  if (t === "function" || t === "undefined") return null;

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    const arr: JSONArray = [];
    for (const v of value) {
      const s = sanitize(v);
      // per coerenza JSON, undefined/funzioni diventano null negli array
      arr.push(s === null && (v === undefined || typeof v === "function") ? null : s);
    }
    return arr;
  }

  if (t === "object") {
    const obj: JSONObject = {};
    for (const k of Object.keys(value).sort()) {
      const s = sanitize(value[k]);
      // negli oggetti, salta chiavi con undefined/funzioni (=> null da sanitize)
      if (!(s === null && (value[k] === undefined || typeof value[k] === "function"))) {
        obj[k] = s;
      }
    }
    return obj;
  }

  // Symbol, BigInt non supportati nel payload VC/VP
  throw new Error(`Tipo non supportato nella canonicalizzazione: ${t}`);
}

/** Stringify senza spazi e senza variazioni locali. */
function stableStringify(value: JSONValue): string {
  // JSON.stringify su input già sanificato e con chiavi ordinate è stabile
  return JSON.stringify(value);
}

/**
 * Canonicalizza un valore JS in stringa deterministica.
 * Note:
 * - Non modifica l'oggetto originale.
 * - Usare su VC/VP rimuovendo prima campi esclusi (es. proof, eventHistory).
 */
export function canonicalize(input: any): string {
  const sanitized = sanitize(input);
  return stableStringify(sanitized);
}

/** Helper per canonicalizzare VC escludendo campi non firmati. */
export function canonicalizeVC(vc: Record<string, any>, exclude: string[] = ["proof", "eventHistory"]): string {
  const clone: Record<string, any> = {};
  for (const k of Object.keys(vc)) {
    if (!exclude.includes(k)) clone[k] = vc[k];
  }
  return canonicalize(clone);
}
