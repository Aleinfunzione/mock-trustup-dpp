import * as bip39 from "bip39";
import nacl from "tweetnacl";
import { sha256 } from "js-sha256";

/** MOCK: da mnemonic → seed32 (sha256 del mnemonic) → keypair ed25519 → DID pseudo */
export async function deriveFromMnemonic(mnemonic: string) {
  if (!bip39.validateMnemonic(mnemonic.trim())) {
    throw new Error("Seed phrase non valida (BIP39).");
  }
  const seed32 = new Uint8Array(Buffer.from(sha256.arrayBuffer(mnemonic.trim())));
  const kp = nacl.sign.keyPair.fromSeed(seed32);
  const pubHex = Buffer.from(kp.publicKey).toString("hex");
  const did = `did:mock:${sha256(pubHex).slice(0, 32)}`;
  return { did, keyPair: kp };
}
