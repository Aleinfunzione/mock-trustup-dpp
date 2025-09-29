// src/pages/products/ProductAttributesPage.tsx
import * as React from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AttributesAndCredentialsTab from "@/components/products/AttributesAndCredentialsTab";
import { getProductById } from "@/services/api/products";

// Alias tipizzato locale
const AttrTab = AttributesAndCredentialsTab as unknown as React.ComponentType<{
  productId: string;
}>;

export default function ProductAttributesPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  // Company vs Creator
  const isCompany = location.pathname.startsWith("/company/");
  const baseListPath = isCompany ? "/company/products" : "/creator/products";
  const baseDetailPath = baseListPath;

  const [exists, setExists] = React.useState(false);
  const [name, setName] = React.useState<string>("");

  React.useEffect(() => {
    if (!id) return;
    const p = getProductById(id);
    if (p) {
      setExists(true);
      setName((p as any).name ?? id);
    } else {
      setExists(false);
      setName("");
    }
  }, [id]);

  if (!id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prodotto non trovato</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to={baseListPath}>Indietro</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!exists) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prodotto non trovato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Nessun prodotto con ID <code>{id}</code> nello storage locale.
          </p>
          <Button asChild variant="outline">
            <Link to={baseListPath}>Indietro</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Caratteristiche &amp; Credenziali — {name}
        </h1>
        <Button asChild variant="outline">
          <Link to={`${baseDetailPath}/${id}`}>Dettagli prodotto</Link>
        </Button>
      </div>

      {/* Tab: Catalogo → Pillole → Aggregato */}
      <AttrTab productId={id} />
    </div>
  );
}
