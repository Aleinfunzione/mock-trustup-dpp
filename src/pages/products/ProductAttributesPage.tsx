// src/pages/products/ProductAttributesPage.tsx
import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/hooks/useAuth";
import { getProductById, listProductsByCompany } from "@/services/api/products";
import { getIsland } from "@/stores/orgStore";
import ProductTopBar from "@/components/products/ProductTopBar";

type ProductAny = Record<string, any>;

export default function ProductAttributesPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const roleBase = currentUser?.role === "company" ? "/company" : "/creator";
  const basePath = `${roleBase}/products`;
  const companyDid = (currentUser as any)?.companyDid;

  const [product, setProduct] = React.useState<ProductAny | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      let p: ProductAny | undefined;
      try { p = getProductById(id) as any; } catch {}
      if (!p && companyDid) {
        try {
          const list = listProductsByCompany(companyDid) as ProductAny[];
          p = list?.find((x) => x?.id === id);
        } catch {}
      }
      if (alive) { setProduct(p ?? null); setLoading(false); }
    }
    load();
    return () => { alive = false; };
  }, [id, companyDid]);

  if (!id) {
    return (
      <Card>
        <CardHeader><CardTitle>ID prodotto mancante</CardTitle></CardHeader>
        <CardContent><Link className="underline" to={basePath}>Vai ai prodotti</Link></CardContent>
      </Card>
    );
  }

  const islandName =
    product?.islandId && companyDid
      ? (getIsland(companyDid, product.islandId)?.name ?? product.islandId)
      : undefined;

  const baseRows: [string, string][] = (() => {
    const rows: [string, string][] = [];
    const add = (label: string, val: any) => {
      if (val !== undefined && val !== null && val !== "") rows.push([label, String(val)]);
    };
    add("ID", product?.id);
    add("Nome", product?.name ?? product?.title);
    add("Tipo", product?.productType?.name ?? product?.type ?? product?.typeId ?? product?.productTypeId);
    add("Stato", product?.isPublished ? "Pubblicato" : "Bozza");
    add("Azienda DID", product?.companyDid ?? companyDid);
    add("Isola", islandName);
    add("SKU", product?.sku);
    add("Brand", product?.brand);
    add("Modello", product?.model);
    add("GTIN", product?.gtin);
    add("Serial", product?.serialNumber ?? product?.sn);
    add("Creato", product?.createdAt);
    add("Aggiornato", product?.updatedAt);
    return rows;
  })();

  const customRows: [string, string][] = (() => {
    if (!product?.attributes || typeof product.attributes !== "object") return [];
    return Object.entries(product.attributes as Record<string, any>)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
  })();

  return (
    <div className="space-y-6">
      <ProductTopBar roleBase={roleBase} productId={id} />

      <div className="flex items-center justify-between">
        <nav className="text-sm text-muted-foreground">
          <Link to={basePath} className="hover:underline">Prodotti</Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">Caratteristiche</span>
        </nav>
        <Link to={`${roleBase}/products/${id}`} className="text-sm underline">Indietro</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Caratteristiche prodotto</CardTitle>
          <CardDescription>
            {product?.name ? <span className="font-mono">{product.name}</span> : "Dettagli generali"}
            {product?.isPublished ? <Badge className="ml-2">Pubblicato</Badge> : <Badge variant="secondary" className="ml-2">Bozza</Badge>}
            {islandName && <Badge variant="outline" className="ml-2">Isola: {islandName}</Badge>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <div className="text-sm text-muted-foreground">Caricamento…</div>}
          {!loading && !product && <div className="text-sm text-destructive">Prodotto non trovato.</div>}

          {!!product && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {baseRows.map(([label, value]) => (
                  <div key={label} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input value={value} readOnly className="font-mono h-9" />
                  </div>
                ))}
              </div>

              {!!customRows.length && (
                <div className="mt-2">
                  <div className="text-sm font-medium mb-2">Attributi</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {customRows.map(([k, v]) => (
                      <div key={k} className="space-y-1">
                        <Label className="text-xs">{k}</Label>
                        <Input value={v} readOnly className="h-9" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <details className="mt-2">
                <summary className="cursor-pointer text-sm">JSON completo</summary>
                <pre className="text-xs p-3 rounded border overflow-auto bg-muted/30 mt-2">
{JSON.stringify(product, null, 2)}
                </pre>
              </details>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
