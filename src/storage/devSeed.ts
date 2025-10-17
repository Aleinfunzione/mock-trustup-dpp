// src/storage/devSeed.ts
import type { VC } from "@/types/vc";
import { initCredits } from "@/services/api/credits";
import {
  createOrganizationVC,
  createProcessVC,
  createProductVC,
} from "@/services/api/vc";
import { listProductsByCompany } from "@/services/api/products";

export type DevSeedReport = {
  ok: boolean;
  companyDid: string;
  productId?: string;
  orgVC?: VC;
  procVC?: VC;
  productVC?: VC;
  notes?: string[];
  errors?: string[];
};

export async function runDevSeed(params: { adminDid: string; companyDid: string }): Promise<DevSeedReport> {
  const notes: string[] = [];
  const errors: string[] = [];
  const { adminDid, companyDid } = params;

  try {
    initCredits({
      adminId: adminDid,
      companyIds: [companyDid],
      members: [],
      defaults: { balance: 200, threshold: 10 },
    });
    notes.push("Crediti inizializzati per admin e azienda.");
  } catch (e: any) {
    errors.push(`initCredits: ${e?.message || String(e)}`);
  }

  let productId: string | undefined;
  try {
    const list = listProductsByCompany(companyDid) as any[];
    productId = list?.[0]?.id;
    if (!productId) notes.push("Nessun prodotto disponibile. Seed ProductVC verrà saltato.");
  } catch {
    notes.push("Impossibile leggere i prodotti. Seed ProductVC verrà saltato.");
  }

  let orgVC: VC | undefined;
  try {
    orgVC = await createOrganizationVC({
      schemaId: "ISO9001" as any,
      issuerDid: companyDid,
      subjectId: companyDid,
      data: {
        certificationNumber: "ISO-9001-SEED",
        issuingBody: "TÜV",
        validFrom: "2025-01-01",
        validUntil: "2026-01-01",
        scopeStatement: "Seed QA",
      },
    });
    notes.push("OrgVC ISO9001 creata.");
  } catch (e: any) {
    errors.push(`OrgVC: ${e?.message || String(e)}`);
  }

  let procVC: VC | undefined;
  try {
    procVC = await createProcessVC({
      schemaId: "ISO9001" as any,
      issuerDid: companyDid,
      subjectId: "PROC-SEED-1",
      data: {
        processId: "PROC-SEED-1",
        islandId: "ISL-SEED",
        site: "Plant A",
        certificateId: "CERT-SEED",
        validFrom: "2025-01-01",
        validUntil: "2026-01-01",
      },
    });
    notes.push("ProcessVC creata.");
  } catch (e: any) {
    errors.push(`ProcessVC: ${e?.message || String(e)}`);
  }

  let productVC: VC | undefined;
  if (productId) {
    try {
      productVC = await createProductVC({
        schemaId: "GS1-DPP" as any,
        issuerDid: companyDid,
        subjectId: productId,
        data: {
          // productId è il subjectId
          gtin: "00000000000000",
          lot: "LOT-SEED",
        },
      });
      notes.push("ProductVC creata.");
    } catch (e: any) {
      errors.push(`ProductVC: ${e?.message || String(e)}`);
    }
  }

  return {
    ok: errors.length === 0,
    companyDid,
    productId,
    orgVC,
    procVC,
    productVC,
    notes,
    errors,
  };
}
