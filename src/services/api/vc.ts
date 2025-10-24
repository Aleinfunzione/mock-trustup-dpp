// src/services/api/vc.ts
// API VC mock: create/list/get/revoke/supersede/verify + AJV validate

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { StandardsRegistry } from "@/config/standardsRegistry";
import type {
  VC,
  VCStatus,
  ListVCFilter,
  IntegrityResult,
  CreateOrganizationVCInput,
  CreateProcessVCInput,
  CreateProductVCInput,
} from "@/types/vc";
import { computeVCHash } from "@/services/crypto/vcIntegrity";
import { getCompanyAttrs } from "@/services/api/companyAttributes";

/* -------------------- storage helpers (no safeGet/safeSet) -------------------- */
function lsGet<T = any>(key: string): T | null {
  try {
    const s = globalThis.localStorage?.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}
function lsSet<T = any>(key: string, val: T): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

/* -------------------- costanti storage -------------------- */
const INDEX_KEY = "trustup:vc:index"; // string[] di id
function itemKey(id: string) {
  return `trustup:vc:${id}`;
}

/* -------------------- util -------------------- */
function nowISO() {
  return new Date().toISOString();
}
function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  const g: any = typeof globalThis !== "undefined" ? globalThis : {};
  if (g.crypto?.getRandomValues) g.crypto.getRandomValues(arr);
  else for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* -------------------- AJV validation -------------------- */
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemaCache: Record<string, any> = {};

async function loadSchema(schemaId: string): Promise<any> {
  if (schemaCache[schemaId]) return schemaCache[schemaId];
  const cfg = (StandardsRegistry as any)[schemaId];
  if (!cfg) throw new Error(`Schema non registrato: ${schemaId}`);
  if (cfg.schema) {
    schemaCache[schemaId] = cfg.schema;
    return cfg.schema;
  }
  if (cfg.schemaPath) {
    const res = await fetch(cfg.schemaPath);
    if (!res.ok) throw new Error(`Impossibile caricare schema: ${cfg.schemaPath}`);
    const json = await res.json();
    schemaCache[schemaId] = json;
    return json;
  }
  throw new Error(`Schema non disponibile per ${schemaId}`);
}

async function validateAgainstSchema(data: unknown, schemaId: string) {
  const schema = await loadSchema(schemaId);
  const validate = ajv.compile(schema);
  const ok = validate(data);
  if (!ok) {
    const msg = (validate.errors ?? [])
      .map((e) => `${e.instancePath || "/"} ${e.message}`)
      .join("; ");
    throw new Error(`Payload non valido per ${schemaId}: ${msg}`);
  }
}

/* -------------------- storage I/O -------------------- */
function readIndex(): string[] {
  return lsGet<string[]>(INDEX_KEY) ?? [];
}
function writeIndex(ids: string[]) {
  lsSet(INDEX_KEY, ids);
}
function readVC(id: string): VC | null {
  return lsGet<VC>(itemKey(id));
}
function writeVC(vc: VC) {
  lsSet(itemKey(vc.id), vc);
}

/* -------------------- credits (best-effort) -------------------- */
import * as creditsApi from "@/services/api/credits";

async function annotateBilling(
  vc: VC,
  action: "VC_PUBLISH" | "VC_REVOKE" | "VC_SUPERSEDE",
  dedup: string
) {
  try {
    const actor: any = { did: vc.issuerDid, subjectType: vc.subjectType, subjectId: vc.subjectId };
    const res: any = (await (creditsApi as any).spend?.(actor, action, dedup)) ?? null;
    (vc as any).data = {
      ...(vc as any).data,
      billing: {
        amount: res?.amount ?? 0,
        payerType: res?.payerType ?? res?.payer?.ownerType ?? "unknown",
        txRef: res?.txRef ?? res?.txId ?? dedup,
      },
    };
  } catch {
    /* ignore */
  }
}

/* -------------------- firma mock -------------------- */
async function signAndFinalize(partial: any): Promise<VC> {
  const tmp: any = { ...partial, proof: { type: "MockJWS", jws: "" } };
  const jws = await computeVCHash(tmp);
  return { ...partial, proof: { type: "MockJWS", jws } } as VC;
}

/* -------------------- API core -------------------- */
export async function createOrganizationVC(input: CreateOrganizationVCInput): Promise<VC> {
  await validateAgainstSchema(input.data, input.schemaId);
  const base = {
    id: randomHex(16),
    type: ["VerifiableCredential", "OrganizationVC"],
    version: 1,
    issuerDid: input.issuerDid,
    subjectType: "organization" as const,
    subjectId: input.subjectId,
    schemaId: input.schemaId,
    data: { ...input.data },
    status: "valid" as VCStatus,
    eventHistory: [{ ts: nowISO(), type: "create" as const }],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  const vc = await signAndFinalize(base);
  await annotateBilling(vc, "VC_PUBLISH", `vc:${vc.id}:publish`);
  writeVC(vc);
  writeIndex([vc.id, ...readIndex()]);
  return vc;
}

export async function createProcessVC(input: CreateProcessVCInput): Promise<VC> {
  await validateAgainstSchema(input.data, input.schemaId);
  const base = {
    id: randomHex(16),
    type: ["VerifiableCredential", "ProcessVC"],
    version: 1,
    issuerDid: input.issuerDid,
    subjectType: "process" as const,
    subjectId: input.subjectId,
    schemaId: input.schemaId,
    data: { ...input.data },
    status: "valid" as VCStatus,
    eventHistory: [{ ts: nowISO(), type: "create" as const }],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  const vc = await signAndFinalize(base);
  await annotateBilling(vc, "VC_PUBLISH", `vc:${vc.id}:publish`);
  writeVC(vc);
  writeIndex([vc.id, ...readIndex()]);
  return vc;
}

export async function createProductVC(input: CreateProductVCInput): Promise<VC> {
  await validateAgainstSchema(input.data, input.schemaId);
  const base = {
    id: randomHex(16),
    type: ["VerifiableCredential", "ProductVC"],
    version: 1,
    issuerDid: input.issuerDid,
    subjectType: "product" as const,
    subjectId: input.subjectId,
    schemaId: input.schemaId,
    data: { ...input.data },
    status: "valid" as VCStatus,
    eventHistory: [{ ts: nowISO(), type: "create" as const }],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  const vc = await signAndFinalize(base);
  await annotateBilling(vc, "VC_PUBLISH", `vc:${vc.id}:publish`);
  writeVC(vc);
  writeIndex([vc.id, ...readIndex()]);
  return vc;
}

export async function listVCs(filter?: ListVCFilter): Promise<VC[]> {
  const ids = readIndex();
  const out: VC[] = [];
  for (const id of ids) {
    const vc = readVC(id);
    if (!vc) continue;
    if (filter?.subjectType && vc.subjectType !== filter.subjectType) continue;
    if (filter?.subjectId && vc.subjectId !== filter.subjectId) continue;
    if (filter?.schemaId && vc.schemaId !== filter.schemaId) continue;
    if (filter?.status && vc.status !== filter.status) continue;
    const expected = await computeVCHash(vc);
    (vc as any).__integrityOk = expected === vc.proof?.jws;
    out.push(vc);
  }
  return out;
}

export function getVC(id: string): VC | null {
  return readVC(id);
}

export async function revokeVC(id: string, reason?: string): Promise<VC> {
  const vc = readVC(id);
  if (!vc) throw new Error("VC non trovata");
  if (vc.status === "revoked") return vc;

  vc.status = "revoked";
  (vc as any).revokedAt = nowISO();
  (vc as any).reason = reason ?? "revoked";
  vc.updatedAt = nowISO();
  vc.eventHistory.push({ ts: nowISO(), type: "revoke", note: reason });
  await annotateBilling(vc, "VC_REVOKE", `vc:${vc.id}:revoke`);
  writeVC(vc);
  return vc;
}

export async function supersedeVC(
  id: string,
  newData: Record<string, unknown>
): Promise<{ old: VC; next: VC }> {
  const old = readVC(id);
  if (!old) throw new Error("VC non trovata");

  const baseNext = {
    id: randomHex(16),
    type: old.type,
    version: (old.version ?? 1) + 1,
    issuerDid: old.issuerDid,
    subjectType: old.subjectType,
    subjectId: old.subjectId,
    schemaId: old.schemaId,
    data: { ...newData },
    status: "valid" as VCStatus,
    supersedes: old.id,
    eventHistory: [{ ts: nowISO(), type: "supersede" as const, note: `supersedes ${old.id}` }],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  const next = await signAndFinalize(baseNext);

  await annotateBilling(next, "VC_SUPERSEDE", `vc:${next.id}:supersede`);

  old.status = "superseded";
  (old as any).supersededBy = next.id;
  old.updatedAt = nowISO();
  old.eventHistory.push({ ts: nowISO(), type: "supersede", note: `supersededBy ${next.id}` });

  writeVC(old);
  writeVC(next);
  writeIndex([next.id, ...readIndex()]);
  return { old, next };
}

export async function verifyIntegrity(idOrVC: string | VC): Promise<IntegrityResult> {
  const vc = typeof idOrVC === "string" ? readVC(idOrVC) : idOrVC;
  if (!vc) throw new Error("VC non trovata");
  const expected = await computeVCHash(vc);
  const actual = vc.proof?.jws ?? "";
  return { valid: expected === actual, expectedHash: expected, actualHash: actual };
}

/* -------------------- VC organizzative per collegamento ai prodotti -------------------- */
export type OrgVC = {
  id: string;
  title: string;
  standardId?: string;
  validFrom?: string;
  validUntil?: string;
};

/**
 * Estrae VC organizzative dall’anagrafica aziendale.
 * Sorgenti accettate:
 *  - orgVCs: [{ id, title, standardId, validFrom, validUntil }]
 *  - certifications: fallback compatibile con { id|vcId|identifier, name|title|standard, notBefore/validFrom, notAfter/validUntil }
 */
export function listOrganizationVC(companyDid: string): OrgVC[] {
  const attrs: any = getCompanyAttrs(companyDid) || {};
  const direct: any[] = Array.isArray(attrs.orgVCs) ? attrs.orgVCs : [];
  const fallback: any[] = Array.isArray(attrs.certifications) ? attrs.certifications : [];
  const rows = (direct.length ? direct : fallback).filter(Boolean);

  return rows
    .map((r) => ({
      id: String(r.id ?? r.vcId ?? r.identifier ?? ""),
      title: String(r.title ?? r.name ?? r.standard ?? r.id ?? "VC"),
      standardId: r.standardId ?? r.standard ?? undefined,
      validFrom: r.validFrom ?? r.notBefore ?? undefined,
      validUntil: r.validUntil ?? r.notAfter ?? undefined,
    }))
    .filter((x) => x.id);
}
