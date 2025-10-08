// src/pages/products/ProductAttributesPage.tsx
import * as React from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AttributesAndCredentialsTab from "@/pages/products/AttributesAndCredentialsTab";
import { getProductById } from "@/services/api/products";

const AttrTab = AttributesAndCredentialsTab as unknown as React.ComponentType<{ productId: string }>;

export default function ProductAttributesPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const isCompany = location.pathname.startsWith("/company/");
  const baseListPath = isCompany ? "/company/products" : "/creator/products";

  const [name, setName] = React.useState<string>("");
  const [exists, setExists] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!id) return;
    try {
      const p = getProductById(id);
      setExists(!!p);
      setName((p as any)?.name ?? id);
    } catch {
      setExists(false);
      setName("");
    }
  }, [id]);

  if (!id) {
    return (
      <Card>
        <CardHeader><CardTitle>Prodotto non specificato</CardTitle></CardHeader>
        <CardContent><Button asChild variant="outline"><Link to={baseListPath}>Indietro</Link></Button></CardContent>
      </Card>
    );
  }

  if (!exists) {
    return (
      <Card>
        <CardHeader><CardTitle>Prodotto non trovato</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Nessun prodotto con ID <code>{id}</code>.</p>
          <Button asChild variant="outline"><Link to={baseListPath}>Indietro</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Caratteristiche &amp; Credenziali — {name}</h1>
        <Button asChild variant="outline"><Link to={`${baseListPath}/${id}`}>Dettagli prodotto</Link></Button>
      </div>
      <AttrTab productId={id} />
    </div>
  );
}
