// src/pages/products/ProductDetailPage.tsx
import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import EventTimeline from "@/components/events/EventTimeline";
import EventForm from "@/components/events/EventForm";
import BOMEditor from "@/components/products/BOMEditor";

import { useProducts } from "@/hooks/useProducts";
import { useAuthStore } from "@/stores/authStore";
import { getActor } from "@/services/api/identity";
import { getProductById, listProductsByCompany } from "@/services/api/products";

import type { BomNode } from "@/types/product";
import type { Product } from "@/types/product";

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { listMine } = useProducts();
  const { currentUser } = useAuthStore();

  // basePath per “torna alla lista” + link azioni
  const role = currentUser?.role;
  const roleBase =
    role === "company" ? "/company" : role === "creator" ? "/creator" : "";
  const basePath =
    role === "company" ? "/company/products" :
    role === "creator" ? "/creator/products" :
    "/products";

  // companyDid robusto
  const actor = currentUser?.did ? getActor(currentUser.did) : undefined;
  const companyDid = currentUser?.companyDid ?? actor?.companyDid;

  // stato locale
  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [assigneeDid, setAssigneeDid] = React.useState("");
  const [timelineKey, setTimelineKey] = React.useState(0);
  const [bomLocal, setBomLocal] = React.useState<BomNode[]>([]);

  // lookup “tollerante”
  React.useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) return;
      setLoading(true);

      // 1) lista personale (comportamento originale)
      let p: Product | undefined;
      try {
        const mine = typeof listMine === "function" ? listMine() : [];
        p = mine?.find((x: any) => x?.id === id);
      } catch {
        /* ignore */
      }

      // 2) direct by id (localStorage / mock)
      if (!p) {
        try {
          p = getProductById(id) as Product | undefined;
        } catch {
          /* ignore */
        }
      }

      // 3) fallback: lista per azienda
      if (!p && companyDid) {
        try {
          const list = listProductsByCompany(companyDid);
          p = list.find((x: any) => x?.id === id);
        } catch {
          /* ignore */
        }
      }

      if (mounted) {
        setProduct(p ?? null);
        setLoading(false);
        setBomLocal((p as any)?.bom ?? []);
      }
    }

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, companyDid]);

  if (!id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ID prodotto mancante</CardTitle>
          <CardDescription>La route non contiene un parametro :id valido.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to={basePath}>Torna ai prodotti</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Caricamento prodotto…</CardTitle>
        </CardHeader>
        <CardContent />
      </Card>
    );
  }

  if (!product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prodotto non trovato</CardTitle>
          <CardDescription>
            Nessun prodotto con ID <span className="font-mono">{id}</span> nel tuo contesto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Torna indietro
          </Button>
          <Button asChild variant="outline">
            <Link to={basePath}>Vai alla lista</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const prodAny = product as any;
  const productTypeLabel =
    (prodAny.type ??
      prodAny.typeId ??
      prodAny.productTypeId ??
      prodAny.productType?.name ??
      "—") as string;

  const attributesHref = roleBase ? `${roleBase}/products/${id}/attributes` : undefined;
  const dppHref = roleBase ? `${roleBase}/products/${id}/dpp` : undefined;

  const isPublished = !!prodAny.isPublished;
  const dppId = prodAny.dppId as string | undefined;
  const publishedBadge = isPublished ? (
    <span className="ml-2 inline-flex items-center rounded bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs">
      Pubblicato
    </span>
  ) : (
    <span className="ml-2 inline-flex items-center rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-xs">
      Bozza
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Header prodotto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <span>{prodAny.name ?? "Prodotto"}</span>
              {publishedBadge}
            </span>
            <span className="text-sm font-normal text-muted-foreground font-mono">
              {prodAny.id}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Tipo:</span> {productTypeLabel}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            Azienda: {prodAny.companyDid ?? currentUser?.companyDid ?? "—"}
          </div>

          {/* Azioni rapide su attributi e DPP */}
          <div className="mt-2 flex flex-wrap gap-2">
            {attributesHref && (
              <Button asChild variant="outline" size="sm">
                <Link to={attributesHref}>Caratteristiche</Link>
              </Button>
            )}
            {dppHref && (
              <Button asChild size="sm">
                <Link to={dppHref}>DPP Viewer</Link>
              </Button>
            )}
            {isPublished && dppId && (
              <Button asChild variant="secondary" size="sm">
                <Link to={dppHref!}>Snapshot: {String(dppId).slice(0, 12)}…</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Registra evento + assegnazione opzionale */}
      <Card>
        <CardHeader>
          <CardTitle>Registra evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assignee">Assegna a DID (opzionale)</Label>
            <Input
              id="assignee"
              placeholder="did:iota:xyz… (operatore o macchina)"
              value={assigneeDid}
              onChange={(e) => setAssigneeDid(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se valorizzato, l’evento comparirà nella dashboard dell’assegnatario.
            </p>
          </div>

          <EventForm
            defaultProductId={prodAny.id}
            assignedToDid={assigneeDid || undefined}
            onCreated={() => setTimelineKey((k) => k + 1)}
          />
        </CardContent>
      </Card>

      {/* Distinta base (BOM) con persistenza e trigger bom.updated */}
      <Card>
        <CardHeader>
          <CardTitle>Distinta base (BOM)</CardTitle>
        </CardHeader>
        <CardContent>
          <BOMEditor
            value={bomLocal}
            onChange={setBomLocal}
            productId={prodAny.id}
            onSaved={(next) => {
              setBomLocal(next);
              setTimelineKey((k) => k + 1); // refresh timeline dopo salvataggio
            }}
          />
        </CardContent>
      </Card>

      {/* Timeline eventi del prodotto */}
      <EventTimeline key={timelineKey} productId={prodAny.id} />
    </div>
  );
}
