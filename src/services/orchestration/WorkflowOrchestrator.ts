// src/services/orchestration/WorkflowOrchestrator.ts
// Orchestrazione compliance → VP → publish con persistenza snapshot.

import type { VerifiablePresentation, VerifiableCredential } from "@/domains/credential/entities";
import { composeVP, signVPAsync, verifyVC, verifyVP } from "@/domains/credential/services";
import {
  evaluateCompliance,
  type ComplianceReport,
  type ComplianceOptions,
} from "@/domains/compliance/services";
import type { StandardId } from "@/config/standardsRegistry";
import { SnapshotStorage } from "@/services/storage/SnapshotStorage";

// Tipi di input: map VC org e prodotto come da credentialStore
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

export const WorkflowOrchestrator = {
  /** Gate di compliance. Se ok, crea VP non firmata con tutte le VC valide. */
  async prepareVP(
    orgVC: OrgVCMap,
    prodVC: ProdVCMap,
    opts?: ComplianceOptions
  ): Promise<PrepareVPResult> {
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
