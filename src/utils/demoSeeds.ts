import { deriveFromMnemonic } from "@/utils/did";
import { identityRegistry, type Role } from "@/utils/identityRegistry";

/** 5 seed pubbliche dai test vector BIP39 (SOLO MOCK) */
export const DEMO_SEEDS: Record<Role, string> = {
  admin:    "legal winner thank year wave sausage worth useful legal winner thank yellow",
  company:  "letter advice cage absurd amount doctor acoustic avoid letter advice cage above",
  creator:  "army van defense carry jealous true garbage claim echo media make crunch",
  operator: "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong",
  machine:  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
};

export async function seedDemoIdentities() {
  for (const [role, mnemonic] of Object.entries(DEMO_SEEDS) as [Role, string][]) {
    const { did, keyPair } = await deriveFromMnemonic(mnemonic);
    identityRegistry.register({
      did,
      role,
      name: role.toUpperCase(),
      publicKeyBase64: Buffer.from(keyPair.publicKey).toString("base64"),
    });
  }
}
