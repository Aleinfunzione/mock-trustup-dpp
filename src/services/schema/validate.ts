// /src/services/schema/validate.ts
import Ajv, { ErrorObject } from "ajv";
import addFormats from "ajv-formats";

// Un singolo AJV condiviso per tutta l'app (performance)
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export type ValidationResult = { ok: boolean; errors: ErrorObject[] };

export function validateData(schema: any, data: any): ValidationResult {
  const validate = ajv.compile(schema);
  const ok = !!validate(data);
  return { ok, errors: (validate.errors || []) as ErrorObject[] };
}

// Messaggi user-friendly per la UI
export function formatAjvErrors(errors: ErrorObject[]): string[] {
  return (errors || []).map((e) => {
    const path = e.instancePath || "";
    const at = path ? ` at ${path}` : "";
    return `${e.message}${at}`;
  });
}
