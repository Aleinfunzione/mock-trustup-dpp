// src/domains/compliance/services.ts
// Valutazione compliance gerarchica basata su StandardsRegistry.
// Input: VC di organizzazione e di prodotto.
// Output: report con stato globale, mancanti e dettagli per standard.

import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";
import type { VerifiableCredential } from "@/domains/credential/entities";
import { validateStandard } from "@/services/schema/validate";
import { verifyVC } from "@/domains/credential/services";

export type Scope = "organization" | "product";

export type ComplianceItem = {
  scope: Scope;
  standard: StandardId;
  present: boolean;           // VC esiste
  validSchema?: boolean;      // passa validateStandard
  validProof?: boolean;       // passa verifyVC
  missingFields?: string[];   // campi richiesti assenti (se noto)
};

export type ComplianceReport = {
  ok: boolean;                // tutti gli standard richiesti presenti+validi
  items: ComplianceItem[];
  missing: { scope: Scope; standard: StandardId; reason: "absent" | "schema" | "proof"; fields?: string[] }[];
  details: Record<string, boolean>; // chiavi "org:ISO9001", "prod:GS1"
};

type VcMap = Partial<Record<StandardId, VerifiableCredential<any> | undefined>>;

function scopedKey(scope: Scope, std: StandardId) {
  return `${scope === "organization" ? "org" : "prod"}:${std}`;
}

function requiredFieldsMissing(standard: StandardId, subject: any): string[] {
  const meta = StandardsRegistry[standard];
  const req = meta?.requiredFields ?? [];
  const missing: string[] = [];
  for (const f of req) {
    const v = subject?.[f];
    if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
      missing.push(f);
    }
  }
  return missing;
}

/**
 * Valuta tutti gli standard noti del registry:
 * - Per scope=organization, guarda in orgVC.
 * - Per scope=product, guarda in prodVC.
 * Un sistema reale potrebbe filtrare “standard richiesti” per tipo prodotto; qui valutiamo tutti.
 */
export async function evaluateCompliance(orgVC: VcMap, prodVC: VcMap): Promise<ComplianceReport> {
  const items: ComplianceItem[] = [];

  for (const [std, meta] of Object.entries(StandardsRegistry)) {
    const standard = std as StandardId;
    if (meta.scope === "organization") {
      items.push(await evalOne("organization", standard, orgVC[standard]));
    } else {
      items.push(await evalOne("product", standard, prodVC[standard]));
    }
  }

  const missing: ComplianceReport["missing"] = [];
  const details: ComplianceReport["details"] = {};
  for (const it of items) {
    const key = scopedKey(it.scope, it.standard);
    const ok = it.present && it.validSchema !== false && it.validProof !== false && (!it.missingFields || it.missingFields.length === 0);
    details[key] = ok;
    if (!ok) {
      const reason: "absent" | "schema" | "proof" =
        !it.present ? "absent" : it.validSchema === false ? "schema" : "proof";
      missing.push({ scope: it.scope, standard: it.standard, reason, fields: it.missingFields?.length ? it.missingFields : undefined });
    }
  }

  return { ok: missing.length === 0, items, missing, details };
}

async function evalOne(scope: Scope, standard: StandardId, vc?: VerifiableCredential<any>): Promise<ComplianceItem> {
  if (!vc) return { scope, standard, present: false };

  // 1) schema
  const subject = vc.credentialSubject ?? {};
  const fieldsMiss = requiredFieldsMissing(standard, subject);
  const schemaRes = await validateStandard(standard, subject);
  const validSchema = schemaRes.ok && fieldsMiss.length === 0;

  // 2) proof
  const proofRes = await verifyVC(vc);
  const validProof = proofRes.valid;

  return {
    scope,
    standard,
    present: true,
    validSchema,
    validProof,
    missingFields: fieldsMiss.length ? fieldsMiss : undefined,
  };
}
