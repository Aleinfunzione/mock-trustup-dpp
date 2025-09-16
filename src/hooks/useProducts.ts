import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import type { Product } from "@/types/product";
import * as productsApi from "@/services/api/products";

// Restituisce i prodotti visibili per l'utente corrente (azienda/creator)
export function useProducts() {
  const { currentUser } = useAuthStore();

  const listMine = useCallback((): Product[] => {
    const anyApi = productsApi as any;
    const all: Product[] =
      typeof anyApi.listAll === "function"
        ? anyApi.listAll()
        : typeof anyApi.getAll === "function"
        ? anyApi.getAll()
        : typeof anyApi.list === "function"
        ? anyApi.list()
        : [];

    if (!currentUser) return all;

    // Adatta questi campi ai tuoi Product reali
    return all.filter((p: any) => {
      return (
        p?.companyDid === currentUser.companyDid ||
        p?.creatorDid === currentUser.did ||
        p?.ownerDid === currentUser.did
      );
    });
  }, [currentUser]);

  return { listMine };
}
