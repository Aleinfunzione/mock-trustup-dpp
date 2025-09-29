// src/domains/product/repository.ts
// Mock repository: persistenza VC per prodotto delegata a CredentialStorage.

import type { VerifiableCredential } from "@/domains/credential/entities";
import type { StandardId } from "@/config/standardsRegistry";
import { CredentialStorage } from "@/services/storage/CredentialStorage";

export const ProductRepository = {
  getVC(productId: string, standard: StandardId): VerifiableCredential<any> | undefined {
    const map = CredentialStorage.loadProdVC();
    return (map[productId] || {})[standard];
    },
  upsertVC(productId: string, standard: StandardId, vc: VerifiableCredential<any>) {
    const map = CredentialStorage.loadProdVC();
    const forProd = { ...(map[productId] || {}) };
    forProd[standard] = vc;
    map[productId] = forProd;
    CredentialStorage.saveProdVC(map);
  },
  removeVC(productId: string, standard: StandardId) {
    const map = CredentialStorage.loadProdVC();
    const forProd = { ...(map[productId] || {}) };
    delete (forProd as any)[standard];
    map[productId] = forProd;
    CredentialStorage.saveProdVC(map);
  },
  listVC(productId: string): Record<string, VerifiableCredential<any>> {
    const map = CredentialStorage.loadProdVC();
    return (map[productId] || {}) as any;
  },
};
