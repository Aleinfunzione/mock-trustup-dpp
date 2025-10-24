// src/services/orchestration/WorkflowOrchestrator.ts
// Orchestrazione compliance → VP → publish con persistenza snapshot.
// Compat: 1) flusso "domain/*"  2) fallback su nuovo services/api/vc

import type { VerifiablePresentation, VerifiableCredential } from "@/domains/credential/entities";
import { composeVP, signVPAsync, verifyVC, verifyVP } from "@/domains/credential/services";
import {
  evaluateCompliance,
  type ComplianceReport,
  type ComplianceOptions,
} from "@/domains/compliance/services";
import type { StandardId } from "@/config/standardsRegistry";
import { SnapshotStorage } from "@/services/storage/SnapshotStorage";

/* ---- Fallback nuovo storage VC ---- */
import { listVCs } from "@/services/api/vc";
import type { VC, VCStatus } from "@/types/vc";

/* ---- Dati prodotto + defs compliance ---- */
import { getProductById } from "@/services/api/products";
import { getCompanyAttrs, type ComplianceDef } from "@/services/api/companyAttributes";

/* ---- Eventi ---- */
import { createEvent } from "@/services/api/events";

/* ============================== Tipi ============================== */

export type OrgVCMap = Partial<Record<StandardId, VerifiableCredential<any>>>;
export type ProdVCMap = Partial<Record<StandardId, VerifiableCredential<any>>>;

export type PrepareVPResult =
  | { ok: true; vp: VerifiablePresentation; included: number; report: ComplianceReport }
  | { ok: false; report: ComplianceReport; message: string };

export type PublishResult =
  | { ok: true; snapshotId: string; vp: VerifiablePresentation }
  | { ok: false; message: string };

/* ============================ Helpers ============================ */

function collectCreds(org: OrgVCMap, prod: ProdVCMap): VerifiableCredential[] {
  const res: VerifiableCredential[] = [];
  for (const v of Object.values(org)) if (v) res.push(v);
  for (const v of Object.values(prod)) if (v) res.push(v);
  return res;
}

async function verifyAllVC(creds: VerifiableCredential[]) {
  const results = await Promise.all(creds.map((vc) => verifyVC(vc)));
  return results.every((r) => r.valid);
}

function hasDomainVC(org: OrgVCMap, prod: ProdVCMap) {
  return Object.values(org).some(Boolean) || Object.values(prod).some(Boolean);
}

function productIdFromLocation(): string | null {
  const p = globalThis.location?.pathname ?? "";
  const m = p.match(/\/products\/([^/]+)\/dpp/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function adaptVC(v: VC): VerifiableCredential<any> {
  const schemaName = (v as any).schemaId ?? (v as any).standardId ?? "VC";
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", `Adapted${schemaName}`],
    issuer: (v as any).issuerDid ?? (v as any).issuer ?? "did:unknown",
    issuanceDate: (v as any).createdAt ?? new Date().toISOString(),
    credentialSubject: { ...(v as any).data },
    proof: {
      type: "DataIntegrityProof",
      created: (v as any).updatedAt ?? (v as any).createdAt ?? new Date().toISOString(),
      proofPurpose: "assertionMethod",
      verificationMethod: `${(v as any).issuerDid ?? "did:unknown"}#key-1`,
      proofValue: (v as any)?.proof?.jws ?? "",
    } as any,
  };
}

type MissingItem = ComplianceReport["missing"] extends ReadonlyArray<infer T> ? T : never;

function fallbackReport(orgNum: number, prodNum: number, pid: string): ComplianceReport {
  const missing: any[] = [];
  if (orgNum === 0)
    missing.push({ scope: "organization", standard: "ISO", reason: "Nessuna VC organizzativa valida" });
  if (prodNum === 0)
    missing.push({ scope: "product", standard: "GS1", reason: `Nessuna VC di prodotto valida per ${pid}` });
  return { ok: missing.length === 0, missing: missing as unknown as MissingItem[] } as ComplianceReport;
}

/** VC organizzative collegate al prodotto, con fallback a "tutte" se nessun collegamento */
async function collectFromNewApi(productId: string) {
  const p: any = getProductById(productId);
  const allowed = new Set<string>(Array.isArray(p?.attachedOrgVCIds) ? p.attachedOrgVCIds : []);
  const [orgAll, prod] = await Promise.all([
    listVCs({ subjectType: "organization", status: "valid" as VCStatus }),
    listVCs({ subjectType: "product", subjectId: productId, status: "valid" as VCStatus }),
  ]);
  const org = allowed.size ? orgAll.filter((vc: any) => allowed.has(vc.id)) : orgAll;
  return { org, prod, allowedCount: allowed.size };
}

/* -------- Compliance prodotto: defs aziendali + valori prodotto -------- */

function readProductCompliance(productId: string): {
  attrs: Record<string, unknown>;
  defs: ComplianceDef[];
} {
  const p: any = getProductById(productId);
  if (!p) return { attrs: {}, defs: [] };
  const companyDid: string | undefined = p.companyDid;
  const defs = companyDid ? (getCompanyAttrs(companyDid).compliance ?? []) : [];
  const attrs = (p.complianceAttrs ?? {}) as Record<string, unknown>;
  return { attrs, defs };
}

function missingRequired(defs: ComplianceDef[], attrs: Record<string, unknown>): string[] {
  const requiredKeys = defs.filter((d) => d.required).map((d) => d.key);
  const miss: string[] = [];
  for (const k of requiredKeys) {
    const v = attrs[k];
    const emptyString = typeof v === "string" && v.trim() === "";
    const emptyNumber = typeof v === "number" && !Number.isFinite(v);
    if (v === undefined || v === null || emptyString || emptyNumber) miss.push(k);
  }
  return miss;
}

function mergeComplianceMissing(report: ComplianceReport, missingKeys: string[]): ComplianceReport {
  if (!missingKeys.length) return report;
  const extra = {
    scope: "product",
    standard: "COMPANY_PROFILE",
    reason: `Attributi richiesti mancanti: ${missingKeys.join(", ")}`,
    fields: missingKeys,
  } as any as MissingItem;
  const baseMissing = (report?.missing as any[]) ?? [];
  return { ok: false, missing: [...baseMissing, extra] as any } as ComplianceReport;
}

function attachProductComplianceToVP(vp: VerifiablePresentation, productId: string) {
  const { attrs } = readProductCompliance(productId);
  if (!attrs || Object.keys(attrs).length === 0) return vp;
  const withMeta: any = vp;
  withMeta.trustup = {
    ...(withMeta.trustup || {}),
    productComplianceStandard: "COMPANY_PROFILE",
    productComplianceAttrs: attrs,
    productId,
  };
  return withMeta as VerifiablePresentation;
}

/* ---- Emitter eventi con campi obbligatori sempre valorizzati ---- */
function emitProductEvent(productId: string, data: any) {
  const p: any = getProductById(productId);
  if (!p) return;
  createEvent({
    type: "product.updated",
    productId: p.id,
    companyDid: p.companyDid,
    actorDid: p.createdByDid,
    data,
  });
}

/* ============================ Orchestratore ============================ */

export const WorkflowOrchestrator = {
  async prepareVP(
    orgVC: OrgVCMap,
    prodVC: ProdVCMap,
    opts?: ComplianceOptions
  ): Promise<PrepareVPResult> {
    const pid = productIdFromLocation();

    if (hasDomainVC(orgVC, prodVC)) {
      let report = await evaluateCompliance(orgVC, prodVC, opts);

      if (pid) {
        const { attrs, defs } = readProductCompliance(pid);
        const miss = missingRequired(defs, attrs);
        report = mergeComplianceMissing(report, miss);
      }

      if (!report.ok) return { ok: false, report, message: "Compliance incompleta: mancano credenziali o campi richiesti" };

      const creds = collectCreds(orgVC, prodVC);
      const allVcValid = await verifyAllVC(creds);
      if (!allVcValid) return { ok: false, report, message: "Alcune VC non superano la verifica proof" };

      let vp = composeVP(creds);
      if (pid) vp = attachProductComplianceToVP(vp, pid);

      if (pid) emitProductEvent(pid, { action: "vp.composed", included: creds.length });

      return { ok: true, vp, included: creds.length, report };
    }

    const pid2 = pid;
    if (!pid2) {
      const report = fallbackReport(0, 0, "unknown");
      return { ok: false, report, message: "productId non rilevato dall'URL" };
    }

    const { org, prod, allowedCount } = await collectFromNewApi(pid2);
    let report = fallbackReport(org.length, prod.length, pid2);

    {
      const { attrs, defs } = readProductCompliance(pid2);
      const miss = missingRequired(defs, attrs);
      report = mergeComplianceMissing(report, miss);
    }

    const adapted: VerifiableCredential[] = [...org, ...prod].map(adaptVC);
    let vp = composeVP(adapted);
    vp = attachProductComplianceToVP(vp, pid2);

    emitProductEvent(pid2, {
      action: "vp.composed",
      included: adapted.length,
      org: org.length,
      prod: prod.length,
      filterAttached: allowedCount > 0,
    });

    if (!report.ok) return { ok: false, report, message: "Compliance incompleta nelle VC o negli attributi prodotto" };
    return { ok: true, vp, included: adapted.length, report };
  },

  async publishVP(vp: VerifiablePresentation): Promise<PublishResult> {
    const signed = await signVPAsync(vp);
    const ok = (await verifyVP(signed)).valid;
    if (!ok) return { ok: false, message: "Impossibile verificare la VP firmata" };
    const { id } = SnapshotStorage.save(signed);

    const included = Array.isArray((signed as any)?.verifiableCredential)
      ? (signed as any).verifiableCredential.length
      : undefined;
    const pid = (signed as any)?.trustup?.productId ?? productIdFromLocation() ?? undefined;

    if (pid) emitProductEvent(pid, { action: "vp.published", snapshotId: id, included });

    return { ok: true, snapshotId: id, vp: signed };
  },

  getSnapshot(id: string): VerifiablePresentation | undefined {
    const rec = SnapshotStorage.get<VerifiablePresentation>(id);
    return rec?.vp;
  },

  async generateAndPublishVP(productId: string): Promise<PublishResult> {
    const { org, prod, allowedCount } = await collectFromNewApi(productId);
    let report = fallbackReport(org.length, prod.length, productId);

    {
      const { attrs, defs } = readProductCompliance(productId);
      const miss = missingRequired(defs, attrs);
      report = mergeComplianceMissing(report, miss);
      if (!report.ok) return { ok: false, message: "Compliance incompleta nelle VC o negli attributi prodotto" };
    }

    const adapted: VerifiableCredential[] = [...org, ...prod].map(adaptVC);
    let vp = composeVP(adapted);
    vp = attachProductComplianceToVP(vp, productId);

    emitProductEvent(productId, {
      action: "vp.composed",
      included: adapted.length,
      org: org.length,
      prod: prod.length,
      filterAttached: allowedCount > 0,
    });

    return await this.publishVP(vp);
  },

  async publishForProduct(productId: string) {
    return this.generateAndPublishVP(productId);
  },
  async generateAndPublish(productId: string) {
    return this.generateAndPublishVP(productId);
  },
};

/* ======================= Named exports compat ======================= */

export async function generateAndPublishVP(productId: string): Promise<PublishResult> {
  return WorkflowOrchestrator.generateAndPublishVP(productId);
}
export const publishForProduct = WorkflowOrchestrator.publishForProduct;
export const generateAndPublish = WorkflowOrchestrator.generateAndPublish;

/* ============================== Default ============================== */
export default WorkflowOrchestrator;
