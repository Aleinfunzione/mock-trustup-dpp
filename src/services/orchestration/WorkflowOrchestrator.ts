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

async function collectFromNewApi(productId: string) {
  const [org, prod] = await Promise.all([
    listVCs({ subjectType: "organization", status: "valid" as VCStatus }),
    listVCs({ subjectType: "product", subjectId: productId, status: "valid" as VCStatus }),
  ]);
  return { org, prod };
}

/* ============================ Orchestratore ============================ */

export const WorkflowOrchestrator = {
  async prepareVP(
    orgVC: OrgVCMap,
    prodVC: ProdVCMap,
    opts?: ComplianceOptions
  ): Promise<PrepareVPResult> {
    if (hasDomainVC(orgVC, prodVC)) {
      const report = await evaluateCompliance(orgVC, prodVC, opts);
      if (!report.ok) return { ok: false, report, message: "Compliance incompleta: mancano credenziali o campi richiesti" };
      const creds = collectCreds(orgVC, prodVC);
      const allVcValid = await verifyAllVC(creds);
      if (!allVcValid) return { ok: false, report, message: "Alcune VC non superano la verifica proof" };
      const vp = composeVP(creds);
      return { ok: true, vp, included: creds.length, report };
    }

    const pid = productIdFromLocation();
    if (!pid) {
      const report = fallbackReport(0, 0, "unknown");
      return { ok: false, report, message: "productId non rilevato dall'URL" };
    }

    const { org, prod } = await collectFromNewApi(pid);
    const report = fallbackReport(org.length, prod.length, pid);
    const adapted: VerifiableCredential[] = [...org, ...prod].map(adaptVC);
    const vp = composeVP(adapted);

    if (!report.ok) return { ok: false, report, message: "Compliance incompleta nelle VC del nuovo storage" };
    return { ok: true, vp, included: adapted.length, report };
  },

  async publishVP(vp: VerifiablePresentation): Promise<PublishResult> {
    const signed = await signVPAsync(vp);
    const ok = (await verifyVP(signed)).valid;
    if (!ok) return { ok: false, message: "Impossibile verificare la VP firmata" };
    const { id } = SnapshotStorage.save(signed);
    return { ok: true, snapshotId: id, vp: signed };
  },

  getSnapshot(id: string): VerifiablePresentation | undefined {
    const rec = SnapshotStorage.get<VerifiablePresentation>(id);
    return rec?.vp;
  },

  async generateAndPublishVP(productId: string): Promise<PublishResult> {
    const { org, prod } = await collectFromNewApi(productId);
    const report = fallbackReport(org.length, prod.length, productId);
    const adapted: VerifiableCredential[] = [...org, ...prod].map(adaptVC);
    if (!report.ok) return { ok: false, message: "Compliance incompleta nelle VC del nuovo storage" };
    const vp = composeVP(adapted);
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
