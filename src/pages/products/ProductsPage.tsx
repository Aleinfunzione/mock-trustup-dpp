// src/pages/products/ProductsPage.tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import ProductList from "@/components/products/productList";
import ProductForm from "@/components/products/ProductForm";
import { useAuth } from "@/hooks/useAuth";
import type { Product } from "@/types/product";

// Filtro isole globale
import IslandFilter from "@/components/common/IslandFilter";
import { getIslandFilter, subscribeIsland } from "@/stores/uiStore";

/**
 * Elenco prodotti:
 * - COMPANY: sola lettura con link al dettaglio (/company/products/:id)
 * - CREATOR: pulsante "Nuovo prodotto" → modal con ProductForm
 */
export default function ProductsPage() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const navigate = useNavigate();

  const [open, setOpen] = React.useState(false);
  const readOnly = role === "company";

  // islandId globale (solo display; la lista leggerà il filtro globale a breve)
  const [islandId, setIslandId] = React.useState<string>("");

  React.useEffect(() => {
    const cur = getIslandFilter();
    setIslandId(cur.enabled ? cur.islandId ?? "" : "");
    return subscribeIsland((s) => setIslandId(s.enabled ? s.islandId ?? "" : ""));
  }, []);

  // Dopo creazione dal ProductForm → vai al dettaglio corretto
  function handleCreated(p: Product) {
    const newId = p?.id || (p as any)?._id || (p as any)?.uuid;
    setOpen(false);
    if (!newId) return;

    if (role === "creator") {
      navigate(`/creator/products/${newId}`);
    } else if (role === "company") {
      navigate(`/company/products/${newId}`);
    } else {
      navigate(`/products/${newId}`);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header azioni + filtro isola */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Prodotti</h1>

        <div className="flex items-center gap-3">
          <IslandFilter compact />
          {role === "creator" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>Nuovo prodotto</Button>
              </DialogTrigger>

              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Crea nuovo prodotto</DialogTitle>
                </DialogHeader>

                {/* Usa ProductForm così com’è: fa già la create e chiama onCreated */}
                <ProductForm onCreated={handleCreated} onCancel={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {islandId && (
        <div className="text-xs text-muted-foreground">
          Filtro isola attivo: <span className="font-mono">{islandId}</span>
        </div>
      )}

      {/* Lista prodotti (applicherà il filtro globale a livello di datasource) */}
      <ProductList readOnly={readOnly} />
    </div>
  );
}
