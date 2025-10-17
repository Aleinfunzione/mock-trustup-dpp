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

// Tipi input: map VC org e prodotto come da credentialStore
export type OrgVCMap = Partial<Record<StandardId, VerifiableCredential<any>>>;
export type ProdVCMap = Partial<Record<StandardId, VerifiableCredential<any>>>;

export type PrepareVPResult =
  | { ok: true; vp: VerifiablePresentation; included: number; report: ComplianceReport }
  | { ok: false; report: ComplianceReport; message: string };

export type PublishResult =
  | { ok: true; snapshotId: string; vp: VerifiablePresentation }
  | { ok: false; message: string };

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

// Adattatore VC(new API) -> VerifiableCredential(domain)
function adaptVC(v: VC): VerifiableCredential<any> {
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", `Adapted${v.schemaId}`],
    issuer: v.issuerDid,
    issuanceDate: v.createdAt ?? new Date().toISOString(),
    credentialSubject: { ...(v as any).data },
    proof: {
      type: "DataIntegrityProof",
      created: v.updatedAt ?? v.createdAt ?? new Date().toISOString(),
      proofPurpose: "assertionMethod",
      verificationMethod: `${v.issuerDid}#key-1`,
      proofValue: (v.proof as any)?.jws ?? "",
    } as any,
  };
}

// Tipo elemento mancanza, senza vincoli readonly
type MissingItem = ComplianceReport["missing"] extends ReadonlyArray<infer T> ? T : never;

// Report fallback: almeno 1 OrgVC valida + 1 ProductVC valida
function fallbackReport(orgNum: number, prodNum: number, pid: string): ComplianceReport {
  const missing: any[] = []; // uso any per includere 'reason' senza violare il tipo
  if (orgNum === 0)
    missing.push({
      scope: "organization",
      standard: "ISO",
      reason: "Nessuna VC organizzativa valida",
    });
  if (prodNum === 0)
    missing.push({
      scope: "product",
      standard: "GS1",
      reason: `Nessuna VC di prodotto valida per ${pid}`,
    });
  // cast a ComplianceReport: i campi extra non rompono il consumer
  return { ok: missing.length === 0, missing: missing as unknown as MissingItem[] } as ComplianceReport;
}

export const WorkflowOrchestrator = {
  /** Gate di compliance. Se ok, crea VP non firmata con tutte le VC valide. */
  async prepareVP(
    orgVC: OrgVCMap,
    prodVC: ProdVCMap,
    opts?: ComplianceOptions
  ): Promise<PrepareVPResult> {
    // 1) Percorso originale "domain/*"
    if (hasDomainVC(orgVC, prodVC)) {
      const report = await evaluateCompliance(orgVC, prodVC, opts);
      if (!report.ok) {
        return { ok: false, report, message: "Compliance incompleta: mancano credenziali o campi richiesti" };
      }
      const creds = collectCreds(orgVC, prodVC);
      const allVcValid = await verifyAllVC(creds);
      if (!allVcValid) {
        return { ok: false, report, message: "Alcune VC non superano la verifica proof" };
      }
      const vp = composeVP(creds);
      return { ok: true, vp, included: creds.length, report };
    }

    // 2) Fallback nuovo services/api/vc
    const pid = productIdFromLocation();
    if (!pid) {
      const report = fallbackReport(0, 0, "unknown");
      return { ok: false, report, message: "productId non rilevato dall'URL" };
    }

    const [org, prod] = await Promise.all([
      listVCs({ subjectType: "organization", status: "valid" as VCStatus }),
      listVCs({ subjectType: "product", subjectId: pid, status: "valid" as VCStatus }),
    ]);

    const report = fallbackReport(org.length, prod.length, pid);
    const adapted: VerifiableCredential[] = [...org, ...prod].map(adaptVC);
    const vp = composeVP(adapted);

    if (!report.ok) {
      // unione stretta: nel ramo false serve anche message
      return { ok: false, report, message: "Compliance incompleta nelle VC del nuovo storage" };
    }
    return { ok: true, vp, included: adapted.length, report };
  },

  /** Firma la VP e registra snapshot persistente su localStorage. */
  async publishVP(vp: VerifiablePresentation): Promise<PublishResult> {
    const signed = await signVPAsync(vp);
    const ok = (await verifyVP(signed)).valid;
    if (!ok) return { ok: false, message: "Impossibile verificare la VP firmata" };

    const { id } = SnapshotStorage.save(signed);
    return { ok: true, snapshotId: id, vp: signed };
  },

  /** Recupera VP dallo snapshot pubblicato. */
  getSnapshot(id: string): VerifiablePresentation | undefined {
    const rec = SnapshotStorage.get<VerifiablePresentation>(id);
    return rec?.vp;
  },
};
