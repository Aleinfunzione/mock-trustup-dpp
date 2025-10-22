// src/services/api/companyAttributes.ts
import * as storage from "@/utils/storage";

/* ============================== Tipi ============================== */

export type MachineRef = { id: string; name: string };
export type Shift = { id: string; name: string; from: string; to: string };
export type EnergyMeter = { id: string; model?: string };

export type Island = {
  id: string;
  name: string;
  lineId?: string;
  machines?: MachineRef[];
  shifts?: Shift[];
  energyMeters?: EnergyMeter[];
  notes?: string;
};

export type ComplianceDef = {
  key: string;
  label?: string;
  desc?: string;
  type?: "string" | "number" | "boolean" | "select";
  required?: boolean;
  options?: Array<{ value: string; label?: string }>;
};

export type CompanyAttributes = {
  vLEI?: string;
  islands?: Island[];
  /** Definizioni degli attributi di compliance da assegnare ai prodotti */
  compliance?: ComplianceDef[];
  updatedAt?: string;
};

/* ============================ Storage utils ============================ */

const sGet =
  (storage as any).safeGet ??
  (storage as any).get ??
  ((k: string) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  });

const sSet =
  (storage as any).safeSet ??
  (storage as any).set ??
  ((k: string, v: unknown) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* no-op */
    }
  });

const sDel =
  (storage as any).safeRemove ??
  (storage as any).remove ??
  ((k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* no-op */
    }
  });

/* ============================== Chiavi ============================== */

const LEGACY_KEY = "mock.company.attrs"; // mappa { [companyDid]: CompanyAttributesLike }
const key = (companyDid: string) => `mock.company.attrs.${companyDid}`;

/* ============================ Normalizzazione ============================ */

function normalize(attrs: Partial<CompanyAttributes> | null): CompanyAttributes {
  return {
    vLEI: attrs?.vLEI,
    islands: Array.isArray(attrs?.islands) ? attrs!.islands : [],
    compliance: Array.isArray(attrs?.compliance) ? attrs!.compliance : [],
    updatedAt: attrs?.updatedAt,
  };
}

/* ============================== Migrazione ============================== */
/**
 * Se esiste la mappa legacy in LEGACY_KEY:
 * - copia l'entry per companyDid in mock.company.attrs.<companyDid>
 * - rimuove la mappa legacy
 */
function migrateIfNeeded(companyDid: string): void {
  const hasNew = !!(sGet as (k: string) => unknown)(key(companyDid));
  if (hasNew) return;

  const legacy = (sGet as (k: string) => unknown)(LEGACY_KEY) as Record<string, unknown> | null;
  if (!legacy || typeof legacy !== "object") return;

  const candidate = legacy[companyDid] as Partial<CompanyAttributes> | undefined;
  if (candidate) {
    const payload: CompanyAttributes = normalize({
      ...candidate,
      updatedAt: candidate.updatedAt ?? new Date().toISOString(),
    });
    (sSet as (k: string, v: unknown) => void)(key(companyDid), payload);
  }

  // Cleanup dell'intera mappa legacy come da checklist
  (sDel as (k: string) => void)(LEGACY_KEY);
}

/* ================================ API ================================ */

export function getCompanyAttrs(companyDid: string): CompanyAttributes {
  migrateIfNeeded(companyDid);
  const raw = (sGet as (k: string) => unknown)(key(companyDid)) as CompanyAttributes | null;
  return normalize(raw);
}

export function setCompanyAttrs(companyDid: string, data: CompanyAttributes): CompanyAttributes {
  const current = getCompanyAttrs(companyDid);
  const payload: CompanyAttributes = normalize({
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  });
  (sSet as (k: string, v: unknown) => void)(key(companyDid), payload);
  return payload;
}

export function setCompanyCompliance(companyDid: string, defs: ComplianceDef[]): CompanyAttributes {
  const attrs = getCompanyAttrs(companyDid);
  return setCompanyAttrs(companyDid, { ...attrs, compliance: defs });
}

export function upsertIsland(companyDid: string, island: Island): CompanyAttributes {
  const attrs = getCompanyAttrs(companyDid);
  const list = [...(attrs.islands ?? [])];
  const i = list.findIndex((x) => x.id === island.id);
  if (i >= 0) list[i] = island;
  else list.push(island);
  return setCompanyAttrs(companyDid, { ...attrs, islands: list });
}

export function removeIsland(companyDid: string, islandId: string): CompanyAttributes {
  const attrs = getCompanyAttrs(companyDid);
  const list = (attrs.islands ?? []).filter((x) => x.id !== islandId);
  return setCompanyAttrs(companyDid, { ...attrs, islands: list });
}
