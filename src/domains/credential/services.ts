// src/domains/credential/services.ts
// Firma/verifica VC/VP e composizione VP.

import { canonicalizeVC } from "@/services/crypto/canonicalize";
import { hashCanonicalString, sha256Async } from "@/services/crypto/hash";
import type {
  VerifiableCredential,
  VerifiablePresentation,
  DataIntegrityProof,
} from "./entities";
import { makeVP } from "./entities";

export type VerifyResult =
  | { valid: true }
  | { valid: false; reason: "missing_proof" | "mismatch"; expected?: string; got?: string };

function buildProof(jws: string): DataIntegrityProof {
  return { type: "DataIntegrityProof", created: new Date().toISOString(), jws };
}

/** Firma una VC calcolando sha256 sul payload canonicalizzato senza `proof` e `eventHistory`. */
export async function signVCAsync<T = any>(vc: VerifiableCredential<T>): Promise<VerifiableCredential<T>> {
  const payload = canonicalizeVC(vc, ["proof", "eventHistory"]);
  const jws = await hashCanonicalString(payload);
  return { ...vc, proof: buildProof(jws) };
}

/** Verifica integrità VC confrontando l'hash del payload canonicalizzato con `proof.jws`. */
export async function verifyVC<T = any>(vc: VerifiableCredential<T>): Promise<VerifyResult> {
  if (!vc.proof?.jws) return { valid: false, reason: "missing_proof" };
  const payload = canonicalizeVC(vc, ["proof", "eventHistory"]);
  const expected = await hashCanonicalString(payload);
  const got = vc.proof.jws;
  return expected === got ? { valid: true } : { valid: false, reason: "mismatch", expected, got };
}

/** Crea una VP semplice aggregando VC fornite. Non firma di default. */
export function composeVP(credentials: VerifiableCredential[], context?: string[]): VerifiablePresentation {
  return makeVP(credentials, context);
}

/** Firma una VP sul payload canonicalizzato senza `proof` (non include hash VC). */
export async function signVPAsync(vp: VerifiablePresentation): Promise<VerifiablePresentation> {
  // Canonicalizzazione minimale: escludiamo la proof della VP. Le VC interne restano come sono.
  const payload = canonicalizeVC(vp as unknown as Record<string, any>, ["proof"]);
  const jws = await sha256Async(payload);
  return { ...vp, proof: buildProof(jws) };
}

/** Verifica proof della VP (non ricalcola hash delle VC interne). */
export async function verifyVP(vp: VerifiablePresentation): Promise<VerifyResult> {
  if (!vp.proof?.jws) return { valid: false, reason: "missing_proof" };
  const payload = canonicalizeVC(vp as unknown as Record<string, any>, ["proof"]);
  const expected = await sha256Async(payload);
  const got = vp.proof.jws;
  return expected === got ? { valid: true } : { valid: false, reason: "mismatch", expected, got };
}
