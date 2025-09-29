// src/stores/complianceStore.ts
// Cache ultimo report di compliance per prodotto.

import { create } from "zustand";
import { evaluateCompliance, type ComplianceReport } from "@/domains/compliance/services";
import { useCredentialStore } from "./credentialStore";

type State = {
  last?: ComplianceReport;
  checking: boolean;
};

type Actions = {
  checkForProduct: (productId: string) => Promise<ComplianceReport>;
  reset: () => void;
};

export const useComplianceStore = create<State & Actions>((set) => ({
  checking: false,

  reset: () => set({ last: undefined }),

  checkForProduct: async (productId: string) => {
    set({ checking: true });
    try {
      const { org, prod } = useCredentialStore.getState();
      const report = await evaluateCompliance(org, prod[productId] || {});
      set({ last: report, checking: false });
      return report;
    } catch (e) {
      set({ checking: false });
      throw e;
    }
  },
}));
