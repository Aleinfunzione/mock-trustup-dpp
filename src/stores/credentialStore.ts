// src/stores/credentialStore.ts
// Stato gerarchico VC: organizzazione + per-prodotto, con persistenza.

import { create } from "zustand";
import type { VerifiableCredential } from "@/domains/credential/entities";
import type { StandardId } from "@/config/standardsRegistry";
import { CredentialStorage, OrgVCMap, ProdVCMap } from "@/services/storage/CredentialStorage";

type State = {
  org: OrgVCMap;
  prod: ProdVCMap;
};

type Actions = {
  load: () => void;
  clear: () => void;

  upsertOrgVC: (standard: StandardId, vc: VerifiableCredential<any>) => void;
  removeOrgVC: (standard: StandardId) => void;

  upsertProdVC: (productId: string, standard: StandardId, vc: VerifiableCredential<any>) => void;
  removeProdVC: (productId: string, standard: StandardId) => void;
};

export const useCredentialStore = create<State & Actions>((set, get) => ({
  org: {},
  prod: {},

  load: () => {
    set({
      org: CredentialStorage.loadOrgVC(),
      prod: CredentialStorage.loadProdVC(),
    });
  },

  clear: () => {
    set({ org: {}, prod: {} });
    CredentialStorage.saveOrgVC({});
    CredentialStorage.saveProdVC({});
  },

  upsertOrgVC: (standard, vc) => {
    const next = { ...get().org, [standard]: vc };
    set({ org: next });
    CredentialStorage.saveOrgVC(next);
  },

  removeOrgVC: (standard) => {
    const next = { ...get().org };
    delete (next as any)[standard];
    set({ org: next });
    CredentialStorage.saveOrgVC(next);
  },

  upsertProdVC: (productId, standard, vc) => {
    const current = get().prod[productId] || {};
    const nextForProd = { ...current, [standard]: vc };
    const next = { ...get().prod, [productId]: nextForProd };
    set({ prod: next });
    CredentialStorage.saveProdVC(next);
  },

  removeProdVC: (productId, standard) => {
    const current = get().prod;
    const forProd = { ...(current[productId] || {}) };
    delete (forProd as any)[standard];
    const next = { ...current, [productId]: forProd };
    set({ prod: next });
    CredentialStorage.saveProdVC(next);
  },
}));
