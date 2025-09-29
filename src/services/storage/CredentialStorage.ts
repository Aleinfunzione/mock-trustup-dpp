// src/services/storage/CredentialStorage.ts
// Storage mock su localStorage per VC organizzazione e prodotto.

import { safeGet, safeSet } from "@/utils/storage";
import type { VerifiableCredential } from "@/domains/credential/entities";
import type { StandardId } from "@/config/standardsRegistry";

const LS_KEYS = {
  ORG_VC: "trustup:vc:org",                    // Record<StandardId, VC>
  PROD_VC: "trustup:vc:prod",                  // Record<productId, Record<StandardId, VC>>
} as const;

export type OrgVCMap = Partial<Record<StandardId, VerifiableCredential<any>>>;
export type ProdVCMap = Record<string, Partial<Record<StandardId, VerifiableCredential<any>>>>;

export const CredentialStorage = {
  loadOrgVC(): OrgVCMap {
    return safeGet<OrgVCMap>(LS_KEYS.ORG_VC, {}) || {};
  },
  saveOrgVC(map: OrgVCMap) {
    safeSet(LS_KEYS.ORG_VC, map);
  },
  loadProdVC(): ProdVCMap {
    return safeGet<ProdVCMap>(LS_KEYS.PROD_VC, {}) || {};
  },
  saveProdVC(map: ProdVCMap) {
    safeSet(LS_KEYS.PROD_VC, map);
  },
};
