// src/services/crypto/hash.ts
// SHA-256 browser-native con Web Crypto. Output esadecimale lowercase.

function toUint8(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return new TextEncoder().encode(input);
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let hex = "";
  for (let i = 0; i < view.length; i++) {
    const b = view[i].toString(16).padStart(2, "0");
    hex += b;
  }
  return hex;
}

/** Calcola SHA-256 e ritorna stringa esadecimale. */
export async function sha256Async(input: string | Uint8Array): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto API non disponibile");
  }
  const data = toUint8(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

/** Versione sync usando Web Crypto sincrono non esiste: wrapper che lancia. */
export function sha256(_input: string | Uint8Array): string {
  throw new Error("Usa sha256Async() nel browser");
}

/** Helper: hash canonico VC (string già canonicalizzata). */
export async function hashCanonicalString(s: string): Promise<string> {
  return sha256Async(s);
}
