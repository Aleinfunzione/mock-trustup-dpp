// /src/services/schema/validate.ts
import Ajv, { ErrorObject, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { StandardId } from "@/config/standardsRegistry";
import { StandardsRegistry } from "@/config/standardsRegistry";
import { loadSchema, loadStandardSchema } from "./loader";

// --- AJV singleton -----------------------------------------------------------
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
});
addFormats(ajv);

// Formati minimi se assenti o personalizzati
ajv.addFormat("date", {
  type: "string",
  validate: (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s),
});

// --- Cache validator ---------------------------------------------------------
// WeakMap non supporta .clear(): usare riassegnazione in clearValidatorCaches()
let weakCache: WeakMap<any, ValidateFunction> = new WeakMap(); // cache per riferimento oggetto
const strCache = new Map<string, ValidateFunction>();           // cache per chiave stabile ($id o JSON)
const pathCache = new Map<string, ValidateFunction>();          // cache per schemaPath::v=VERSION

function cacheKeyForPath(schemaPath: string, version?: string | number) {
  return version ? `${schemaPath}::v=${version}` : schemaPath;
}

function getValidator(schema: any): ValidateFunction {
  if (!schema || typeof schema !== "object") {
    return ajv.compile({});
  }
  const hit = weakCache.get(schema);
  if (hit) return hit;

  const key = typeof schema.$id === "string" ? schema.$id : JSON.stringify(schema);
  const hit2 = strCache.get(key);
  if (hit2) {
    weakCache.set(schema, hit2);
    return hit2;
  }

  const fn = ajv.compile(schema);
  weakCache.set(schema, fn);
  strCache.set(key, fn);
  return fn;
}

async function getValidatorByPath(schemaPath: string, version?: string | number): Promise<ValidateFunction> {
  const key = cacheKeyForPath(schemaPath, version);
  const hit = pathCache.get(key);
  if (hit) return hit;

  const schema = await loadSchema(schemaPath, { version });
  const fn = ajv.compile(schema);
  pathCache.set(key, fn);
  return fn;
}

async function getValidatorByStandard(standardId: StandardId): Promise<ValidateFunction> {
  const std = StandardsRegistry[standardId];
  if (!std) throw new Error(`Standard non registrato: ${standardId}`);
  const key = cacheKeyForPath(std.schemaPath, std.version);
  const hit = pathCache.get(key);
  if (hit) return hit;

  const schema = await loadStandardSchema(standardId);
  const fn = ajv.compile(schema);
  pathCache.set(key, fn);
  return fn;
}

// --- Tipi ed helpers ---------------------------------------------------------
export type ValidationResult = { ok: boolean; errors: ErrorObject[]; message?: string };

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

// --- API esistente (retro-compatibile) --------------------------------------
export function validateData(schema: any, data: any): ValidationResult {
  try {
    const validate = getValidator(schema);
    const ok = !!validate(data);
    const errors = (validate.errors || []) as ErrorObject[];
    return { ok, errors, message: ok ? undefined : shortMessage(errors) };
  } catch (e) {
    return { ok: false, errors: [], message: (e as Error).message || "Schema compilation error" };
  }
}

// --- Nuove API: path e StandardId -------------------------------------------
export async function validateByPath(
  schemaPath: string,
  data: unknown,
  opts?: { version?: string | number }
): Promise<ValidationResult> {
  try {
    const validate = await getValidatorByPath(schemaPath, opts?.version);
    const ok = !!validate(data);
    const errors = (validate.errors || []) as ErrorObject[];
    return { ok, errors, message: ok ? undefined : shortMessage(errors) };
  } catch (e) {
    return { ok: false, errors: [], message: (e as Error).message || "Schema load/compile error" };
  }
}

export async function validateStandard(standardId: StandardId, data: unknown): Promise<ValidationResult> {
  try {
    const validate = await getValidatorByStandard(standardId);
    const ok = !!validate(data);
    const errors = (validate.errors || []) as ErrorObject[];
    return { ok, errors, message: ok ? undefined : shortMessage(errors) };
  } catch (e) {
    return { ok: false, errors: [], message: (e as Error).message || "Standard load/compile error" };
  }
}

// --- Utility -----------------------------------------------------------------
export function getAjvInstance() {
  return ajv;
}

export function clearValidatorCaches() {
  weakCache = new WeakMap(); // resetta la WeakMap
  strCache.clear();
  pathCache.clear();
}
