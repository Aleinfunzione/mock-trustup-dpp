// src/domains/product/services.ts
// Helper per generare/validare VC di prodotto (GS1, EU_DPP_*).

import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";
import { makeVC, type VerifiableCredential } from "@/domains/credential/entities";
import { signVCAsync, verifyVC } from "@/domains/credential/services";
import { validateStandard } from "@/services/schema/validate";

type ProductStandard = Extract<StandardId, "GS1" | "EU_DPP_TEXTILE" | "EU_DPP_ELECTRONICS">;

export async function createProductVC<T extends Record<string, any>>(params: {
  standard: ProductStandard;
  issuerDid: string;
  subject: T;
}): Promise<VerifiableCredential<T>> {
  const meta = StandardsRegistry[params.standard];
  if (!meta || meta.scope !== "product") throw new Error("Standard non valido per prodotto");
  const vc = makeVC<T>({
    types: [`${params.standard}Credential`],
    issuer: params.issuerDid,
    subject: params.subject,
    standard: params.standard,
    version: meta.version,
  });
  const res = await validateStandard(params.standard, params.subject);
  if (!res.ok) throw new Error(`Subject non valido: ${res.message ?? "schema errors"}`);
  return signVCAsync(vc);
}

export async function verifyProductVC(vc: VerifiableCredential<any>) {
  return verifyVC(vc);
}
