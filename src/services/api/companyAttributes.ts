// src/services/api/companyAttributes.ts
import * as storage from "@/utils/storage";

// Tipi
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

export type CompanyAttributes = {
  vLEI?: string;
  islands?: Island[];
  updatedAt?: string;
};

// Fallback compatibile per moduli storage con export diversi
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

const key = (companyDid: string) => `mock.company.attrs.${companyDid}`;

// API
export function getCompanyAttrs(companyDid: string): CompanyAttributes {
  const raw = (sGet as (k: string) => unknown)(key(companyDid)) as CompanyAttributes | null;
  return raw ?? { islands: [] };
}

export function setCompanyAttrs(companyDid: string, data: CompanyAttributes) {
  const payload: CompanyAttributes = { ...data, updatedAt: new Date().toISOString() };
  (sSet as (k: string, v: unknown) => void)(key(companyDid), payload);
  return payload;
}

export function upsertIsland(companyDid: string, island: Island) {
  const attrs = getCompanyAttrs(companyDid);
  const list = attrs.islands ?? [];
  const i = list.findIndex((x) => x.id === island.id);
  if (i >= 0) list[i] = island;
  else list.push(island);
  return setCompanyAttrs(companyDid, { ...attrs, islands: list });
}

export function removeIsland(companyDid: string, islandId: string) {
  const attrs = getCompanyAttrs(companyDid);
  const list = (attrs.islands ?? []).filter((x) => x.id !== islandId);
  return setCompanyAttrs(companyDid, { ...attrs, islands: list });
}
