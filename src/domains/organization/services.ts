// src/domains/organization/services.ts
// Helper per generare/validare VC di organizzazione in base agli standard.

import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";
import { makeVC, type VerifiableCredential } from "@/domains/credential/entities";
import { signVCAsync, verifyVC } from "@/domains/credential/services";
import { validateStandard } from "@/services/schema/validate";

export async function createOrgVC<T extends Record<string, any>>(params: {
  standard: Extract<StandardId, "ISO9001" | "ISO14001" | "TUV">;
  issuerDid: string;
  subject: T;           // credentialSubject conforme allo schema standard
}): Promise<VerifiableCredential<T>> {
  const meta = StandardsRegistry[params.standard];
  if (!meta || meta.scope !== "organization") throw new Error("Standard non valido per organizzazione");
  const vc = makeVC<T>({
    types: [`${params.standard}Credential`],
    issuer: params.issuerDid,
    subject: params.subject,
    standard: params.standard,
    version: meta.version,
  });
  // Valida subject contro schema
  const res = await validateStandard(params.standard, params.subject);
  if (!res.ok) throw new Error(`Subject non valido: ${res.message ?? "schema errors"}`);
  // Firma
  return signVCAsync(vc);
}

export async function verifyOrgVC(vc: VerifiableCredential<any>) {
  return verifyVC(vc);
}
