import * as React from "react";
import ProductList from "@/components/products/productList";
import { useAuth } from "@/hooks/useAuth";

/**
 * Elenco prodotti:
 * - per COMPANY: sola lettura con link al dettaglio (/company/products/:id)
 * - per CREATOR (se mai riusata): mostra anche pulsante "Nuovo prodotto" se gli passi onCreateNew
 */
export default function ProductsPage() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const readOnly = role === "company";

  return <ProductList readOnly={readOnly} />;
}
