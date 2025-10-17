// src/services/crypto/vcIntegrity.ts
// Canonicalizzazione deterministica + SHA-256 (browser + Node >=19/jsdom)

function isObject(x: any): x is Record<string, any> {
  return x && typeof x === "object" && !Array.isArray(x);
}

function stableSortKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stableSortKeys);
  if (!isObject(obj)) return obj;
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj).sort()) out[k] = stableSortKeys(obj[k]);
  return out;
}

export function canonicalize(obj: any): string {
  return JSON.stringify(stableSortKeys(obj));
}

function toHex(buf: ArrayBuffer): string {
  const v = new Uint8Array(buf);
  return Array.from(v).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Usa WebCrypto se disponibile. Niente import/require di moduli Node. */
export async function sha256Hex(input: string): Promise<string> {
  const g: any = typeof globalThis !== "undefined" ? globalThis : {};
  // Browser e Node >=19 (vitest/jsdom) espongono crypto.subtle
  const subtle =
    g.crypto?.subtle ??
    // tentativo prudente: Node webcrypto se presente su require, ma senza import statici
    (typeof g.require === "function" ? g.require("crypto")?.webcrypto?.subtle : undefined);

  if (!subtle) {
    throw new Error(
      "WebCrypto non disponibile. Esegui in browser moderno o Node >=19 (vitest) con webcrypto."
    );
  }

  const data = new TextEncoder().encode(input);
  const hash = await subtle.digest("SHA-256", data);
  return toHex(hash);
}

export async function computeVCHash(vc: any): Promise<string> {
  const { proof, eventHistory, ...rest } = vc || {};
  const canon = canonicalize(rest);
  return sha256Hex(canon);
}
