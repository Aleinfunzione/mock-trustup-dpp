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
      {/* Header azioni (solo per Creator) */}
      {role === "creator" && (
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">I miei prodotti</h1>

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
        </div>
      )}

      {/* Lista prodotti */}
      <ProductList readOnly={readOnly} />
    </div>
  );
}
