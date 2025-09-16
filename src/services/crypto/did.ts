// ⚠️ MOCK: NON usare in produzione.
import { generateMnemonic, validateMnemonic } from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english"

function rng(bytes: number): Uint8Array {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return a
}

export function normalizeMnemonic(m: string): string {
  return m.trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ")
}

export function generateMnemonic12(): string {
  // prima: generateMnemonic(wordlist, 128, rng)
  return generateMnemonic(wordlist, 128)
}
export function generateMnemonic24(): string {
  // prima: generateMnemonic(wordlist, 256, rng)
  return generateMnemonic(wordlist, 256)
}
export function isValidMnemonic(m: string): boolean {
  return validateMnemonic(normalizeMnemonic(m), wordlist)
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest("SHA-256", enc)
  const bytes = Array.from(new Uint8Array(buf))
  return bytes.map(b => b.toString(16).padStart(2, "0")).join("")
}

// Derivazione MOCK da mnemonica → chiavi
export async function deriveKeypairFromMnemonic(
  mnemonic: string
): Promise<{ publicKey: string; privateKey: string }> {
  const norm = normalizeMnemonic(mnemonic)
  const priv = await sha256Hex(norm)
  const pub = await sha256Hex(priv)
  return { publicKey: pub, privateKey: priv }
}

export function didFromPublicKey(pub: string): string {
  return `did:mock:${pub.slice(0, 16)}`
}
