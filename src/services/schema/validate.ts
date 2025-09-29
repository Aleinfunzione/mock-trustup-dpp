// /src/services/schema/validate.ts
import Ajv, { ErrorObject, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

// AJV singleton per tutta l'app
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Cache validator per schema (evita ricompilazioni)
const weakCache = new WeakMap<any, ValidateFunction>();
const strCache = new Map<string, ValidateFunction>();

function getValidator(schema: any): ValidateFunction {
  if (!schema || typeof schema !== "object") {
    // compila uno schema banale per evitare crash
    return ajv.compile({});
  }
  // 1) cache per riferimento oggetto
  const hit = weakCache.get(schema);
  if (hit) return hit;

  // 2) cache per chiave stabile (usa $id oppure stringifica)
  const key = typeof schema.$id === "string" ? schema.$id : JSON.stringify(schema);
  const hit2 = strCache.get(key);
  if (hit2) {
    weakCache.set(schema, hit2);
    return hit2;
  }

  // 3) compila e memoizza
  const fn = ajv.compile(schema);
  weakCache.set(schema, fn);
  strCache.set(key, fn);
  return fn;
}

export type ValidationResult = { ok: boolean; errors: ErrorObject[]; message?: string };

export function validateData(schema: any, data: any): ValidationResult {
  try {
    const validate = getValidator(schema);
    const ok = !!validate(data);
    const errors = (validate.errors || []) as ErrorObject[];
    return { ok, errors, message: ok ? undefined : shortMessage(errors) };
  } catch (e) {
    // errore di compilazione schema
    return {
      ok: false,
      errors: [],
      message: (e as Error).message || "Schema compilation error",
    };
  }
}

// Messaggi user-friendly per la UI
export function formatAjvErrors(errors: ErrorObject[] = []): string[] {
  return errors.map((e) => {
    const path = e.instancePath || "";
    const at = path ? ` at ${path}` : "";
    return `${e.message ?? "invalid"}${at}`;
  });
}

function shortMessage(errors: ErrorObject[]): string {
  const e = errors[0];
  if (!e) return "Validation failed";
  const path = e.instancePath || "";
  return `${e.message ?? "invalid"}${path ? ` at ${path}` : ""}`;
}

// opzionale: esporta l'istanza per plugin esterni
export function getAjvInstance() {
  return ajv;
}
