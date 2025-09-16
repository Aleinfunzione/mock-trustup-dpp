import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import ProductList from "@/components/products/productList";
import ProductForm from "@/components/products/ProductForm"; // se nel repo è lowercase, adegua l'import

/**
 * Lista prodotti per CREATOR:
 * - toggle "Nuovo prodotto" con ProductForm inline (nessun redirect).
 * - elenco prodotti con azione "Apri" che naviga a /creator/products/:id.
 */
export default function CreatorProductsPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Prodotti</CardTitle>
            <CardDescription>
              Crea un nuovo prodotto o gestisci quelli esistenti
            </CardDescription>
          </div>
          <Button
            variant={showCreate ? "secondary" : "default"}
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? "Chiudi" : "Nuovo prodotto"}
          </Button>
        </CardHeader>

        {showCreate && (
          <CardContent className="pt-2">
            <ProductForm onCreated={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">I miei prodotti</CardTitle>
          <CardDescription>Elenco prodotti e azioni rapide</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductList
            readOnly={false}
            onOpenProduct={(id: string) => navigate(`/creator/products/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
