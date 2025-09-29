// src/services/orchestration/WorkflowOrchestrator.ts
// Orchestrazione compliance→VP→publish (mock snapshot).
// Non tocca UI legacy: forniamo anche un adapter per “publish DPP”.

import type { VerifiablePresentation, VerifiableCredential } from "@/domains/credential/entities";
import { composeVP, signVPAsync, verifyVC, verifyVP } from "@/domains/credential/services";
import { evaluateCompliance, type ComplianceReport } from "@/domains/compliance/services";
import type { StandardId } from "@/config/standardsRegistry";

// Tipi di input: map VC org e prodotto come da credentialStore
export type OrgVCMap = Partial<Record<StandardId, VerifiableCredential<any>>>;
export type ProdVCMap = Partial<Record<StandardId, VerifiableCredential<any>>>;

export type PrepareVPResult =
  | { ok: true; vp: VerifiablePresentation; included: number; report: ComplianceReport }
  | { ok: false; report: ComplianceReport; message: string };

export type PublishResult =
  | { ok: true; snapshotId: string; vp: VerifiablePresentation }
  | { ok: false; message: string };

// Mock snapshot registry in-memory (puoi sostituire con storage reale)
const snapshots = new Map<string, VerifiablePresentation>();

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

export const WorkflowOrchestrator = {
  /** Gate di compliance. Se ok, crea VP non firmata con tutte le VC valide. */
  async prepareVP(orgVC: OrgVCMap, prodVC: ProdVCMap): Promise<PrepareVPResult> {
    const report = await evaluateCompliance(orgVC, prodVC);
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
  },

  /** Firma la VP e registra uno snapshot immutabile mock. */
  async publishVP(vp: VerifiablePresentation): Promise<PublishResult> {
    const signed = await signVPAsync(vp);
    const ok = (await verifyVP(signed)).valid;
    if (!ok) return { ok: false, message: "Impossibile verificare la VP firmata" };

    const id = `mock.vp.snapshot.${Date.now()}`;
    snapshots.set(id, signed);
    return { ok: true, snapshotId: id, vp: signed };
  },

  /** Recupera uno snapshot pubblicato. */
  getSnapshot(id: string): VerifiablePresentation | undefined {
    return snapshots.get(id);
  },
};
