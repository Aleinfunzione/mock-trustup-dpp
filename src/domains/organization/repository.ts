// src/domains/organization/repository.ts
// Mock repository: persistenza VC di organizzazione delegata a CredentialStorage.

import type { VerifiableCredential } from "@/domains/credential/entities";
import type { StandardId } from "@/config/standardsRegistry";
import { CredentialStorage } from "@/services/storage/CredentialStorage";

export const OrganizationRepository = {
  getVC(standard: StandardId): VerifiableCredential<any> | undefined {
    const map = CredentialStorage.loadOrgVC();
    return map[standard];
  },
  upsertVC(standard: StandardId, vc: VerifiableCredential<any>) {
    const map = CredentialStorage.loadOrgVC();
    map[standard] = vc;
    CredentialStorage.saveOrgVC(map);
  },
  removeVC(standard: StandardId) {
    const map = CredentialStorage.loadOrgVC();
    delete (map as any)[standard];
    CredentialStorage.saveOrgVC(map);
  },
  listVC(): Record<string, VerifiableCredential<any>> {
    return CredentialStorage.loadOrgVC() as any;
  },
};
