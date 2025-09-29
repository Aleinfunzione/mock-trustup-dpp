// /src/services/dpp/attributes.ts
import type { PillInstance } from "@/config/attributeCatalog";

/** Namespace ammessi. Default: euDpp */
type Namespace = "gs1" | "iso" | "euDpp";

function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T = any>(a: T, b: T): T {
  if (Array.isArray(a) && Array.isArray(b)) {
    // Mock: Last-Write-Wins sugli array
    return b as T;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const out: Record<string, any> = { ...a };
    for (const k of Object.keys(b)) {
      out[k] = k in out ? deepMerge(out[k], (b as any)[k]) : (b as any)[k];
    }
    return out as T;
  }
  return (b ?? a) as T;
}

function setByPath(obj: Record<string, any>, path: string, value: any) {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return;
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i]!;
    cur[k] = isPlainObject(cur[k]) ? cur[k] : {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]!] = value;
}

function normNs(ns?: string): Namespace {
  if (ns === "gs1" || ns === "iso" || ns === "euDpp") return ns;
  return "euDpp";
}

function ts(p: PillInstance, idx: number): number {
  // Ordina per updatedAt > createdAt con fallback stabile all’indice
  const u = p.updatedAt ? Date.parse(String(p.updatedAt)) : NaN;
  const c = p.createdAt ? Date.parse(String(p.createdAt)) : NaN;
  const t = Number.isFinite(u) ? u : Number.isFinite(c) ? c : NaN;
  return Number.isFinite(t) ? t : 1e15 + idx; // mette in coda quelle senza timestamp
}

/**
 * Aggrega pillole per namespace con deep-merge deterministico.
 * Accetta pillole in due forme:
 *  - shape "object": { namespace, data: { ... } }
 *  - shape "path":   { namespace, path: "a.b.c", value: any }
 */
export function aggregateAttributes(pills: PillInstance[] = []) {
  const sorted = [...pills].sort((a, b) => ts(a, 0) - ts(b, 1));

  let gs1: any = {};
  let iso: any = {};
  let euDpp: any = {};

  for (let i = 0; i < sorted.length; i++) {
    const pill = sorted[i]!;
    const ns = normNs((pill as any).namespace);

    // Costruisci payload normalizzato della pillola
    let patch: Record<string, any> = {};
    if (isPlainObject((pill as any).data)) {
      patch = (pill as any).data as Record<string, any>;
    } else if (typeof (pill as any).path === "string") {
      setByPath(patch, (pill as any).path as string, (pill as any).value);
    } else {
      continue; // pillola vuota/non valida
    }

    if (ns === "gs1") gs1 = deepMerge(gs1, patch);
    else if (ns === "iso") iso = deepMerge(iso, patch);
    else euDpp = deepMerge(euDpp, patch);
  }

  return { gs1, iso, euDpp };
}

// Export util per test mirati o riuso interno
export const __test__ = { isPlainObject, deepMerge, setByPath, normNs };
