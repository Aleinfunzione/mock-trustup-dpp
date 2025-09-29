// src/domains/credential/entities.ts
// Tipi W3C VC/VP minimi e riuso in tutta l’app.

export type DataIntegrityProof = {
  type: "DataIntegrityProof";
  created: string;        // ISO string
  jws: string;            // sha256 esadecimale del payload canonicalizzato
};

export type VerifiableCredential<T = any> = {
  "@context": string[];
  type: string[];         // es. ["VerifiableCredential","ISO9001Credential"]
  issuer: string;         // DID o identificativo organizzazione
  issuanceDate: string;   // ISO string
  credentialSubject: T;   // payload conforme allo schema Standard
  proof?: DataIntegrityProof;
  meta?: {
    standard: string;     // es. "ISO9001" | "GS1"
    version?: string;     // versione dallo StandardsRegistry
  };
};

export type VerifiablePresentation = {
  "@context": string[];
  type: string[];         // es. ["VerifiablePresentation"]
  verifiableCredential: VerifiableCredential[];
  proof?: DataIntegrityProof;
};

// Helper factory per inizializzare VC con contesto base W3C
export function makeVC<T>(params: {
  types: string[];
  issuer: string;
  subject: T;
  standard: string;
  version?: string;
  context?: string[];
  issuanceDate?: string;
}): VerifiableCredential<T> {
  return {
    "@context": params.context ?? ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", ...params.types],
    issuer: params.issuer,
    issuanceDate: params.issuanceDate ?? new Date().toISOString(),
    credentialSubject: params.subject,
    meta: { standard: params.standard, version: params.version },
  };
}

export function makeVP(creds: VerifiableCredential[], context?: string[]): VerifiablePresentation {
  return {
    "@context": context ?? ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiablePresentation"],
    verifiableCredential: creds,
  };
}
