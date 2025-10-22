// src/pages/products/ProductDetailPage.tsx
import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

import BOMEditor from "@/components/products/BOMEditor";
import ProductTopBar from "@/components/products/ProductTopBar";

import { useProducts } from "@/hooks/useProducts";
import { useAuthStore } from "@/stores/authStore";
import { getActor } from "@/services/api/identity";
import { getProductById, listProductsByCompany, setProductCompliance, updateProduct } from "@/services/api/products";
import { getIsland } from "@/stores/orgStore";
import { getCompanyAttrs } from "@/services/api/companyAttributes";

import type { BomNode, Product } from "@/types/product";

type ComplianceDef = {
  key: string;
  label?: string;
  desc?: string;
  type?: "string" | "number" | "boolean" | "select";
  required?: boolean;
  options?: Array<{ value: string; label?: string }>;
};

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { listMine } = useProducts();
  const { currentUser } = useAuthStore();

  const role = currentUser?.role;
  const roleBase = role === "company" ? "/company" : role === "creator" ? "/creator" : "";
  const basePath =
    role === "company" ? "/company/products" :
    role === "creator" ? "/creator/products" :
    "/products";

  const actor = currentUser?.did ? getActor(currentUser.did) : undefined;
  const companyDid = currentUser?.companyDid ?? actor?.companyDid;

  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [bomLocal, setBomLocal] = React.useState<BomNode[]>([]);

  // Compliance
  const [defs, setDefs] = React.useState<ComplianceDef[]>([]);
  const [compLocal, setCompLocal] = React.useState<Record<string, any>>({});
  const [savingComp, setSavingComp] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      setLoading(true);

      let p: Product | undefined;
      try {
        const mine = typeof listMine === "function" ? listMine() : [];
        p = mine?.find((x: any) => x?.id === id);
      } catch {}

      if (!p) {
        try { p = getProductById(id) as Product | undefined; } catch {}
      }

      if (!p && companyDid) {
        try {
          const list = listProductsByCompany(companyDid);
          p = list.find((x: any) => x?.id === id);
        } catch {}
      }

      if (mounted) {
        setProduct(p ?? null);
        setBomLocal((p as any)?.bom ?? []);
        const attrs = companyDid ? getCompanyAttrs(companyDid) : undefined;
        const compDefs = Array.isArray((attrs as any)?.compliance) ? ((attrs as any).compliance as ComplianceDef[]) : [];
        setDefs(compDefs);
        setCompLocal(((p as any)?.complianceAttrs as Record<string, any>) ?? {});
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id, companyDid, listMine]);

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
          <Button variant="secondary" onClick={() => navigate(-1)}>Torna indietro</Button>
          <Button asChild variant="outline"><Link to={basePath}>Vai alla lista</Link></Button>
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

  const isPublished = !!prodAny.isPublished;
  const dppId = prodAny.dppId as string | undefined;

  const islandId: string | undefined = prodAny.islandId;
  const islandName =
    islandId && companyDid ? (getIsland(companyDid, islandId)?.name ?? islandId) : undefined;

  const publishedBadge = isPublished ? (
    <span className="ml-2 inline-flex items-center rounded bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs">
      Pubblicato
    </span>
  ) : (
    <span className="ml-2 inline-flex items-center rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-xs">
      Bozza
    </span>
  );

  function parseNumber(v: string): number | undefined {
    const t = v.trim();
    if (t === "") return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }

  async function saveCompliance() {
    if (!id) return;
    setSavingComp(true);
    try {
      // salva direttamente; l'API sanitizza "" → undefined
      const saved = await setProductCompliance(id, compLocal);
      // opzionale: sync locale con ciò che è stato persistito
      setCompLocal(((saved as any)?.complianceAttrs as Record<string, any>) ?? {});
      setProduct(saved);
      toast({ title: "Salvato", description: "Attributi di compliance aggiornati." });
    } catch (e: any) {
      toast({ title: "Errore", description: e?.message ?? "Impossibile salvare", variant: "destructive" });
    } finally {
      setSavingComp(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <ProductTopBar roleBase={roleBase} productId={id} snapshotId={dppId} />

      {/* Breadcrumb + back */}
      <div className="flex items-center justify-between">
        <nav className="text-sm text-muted-foreground">
          <Link to={basePath} className="hover:underline">Prodotti</Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">Descrizione</span>
        </nav>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>Indietro</Button>
      </div>

      {/* Header prodotto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>{prodAny.name ?? "Prodotto"}</span>
              {publishedBadge}
              {islandName && <Badge variant="secondary">Isola: {islandName}</Badge>}
            </span>
            <span className="text-sm font-normal text-muted-foreground font-mono">
              {prodAny.id}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div><span className="text-muted-foreground">Tipo:</span> {productTypeLabel}</div>
          <div className="font-mono text-xs text-muted-foreground">Azienda: {prodAny.companyDid ?? currentUser?.companyDid ?? "—"}</div>
        </CardContent>
      </Card>

      {/* BOM */}
      <Card id="bom">
        <CardHeader><CardTitle>Distinta base (BOM)</CardTitle></CardHeader>
        <CardContent>
          <BOMEditor
            value={bomLocal}
            onChange={setBomLocal}
            productId={prodAny.id}
            onSaved={(next) => { setBomLocal(next); updateProduct(prodAny.id, { bom: next }); }}
          />
        </CardContent>
      </Card>

      {/* Attributi di compliance aziendali */}
      <Card>
        <CardHeader>
          <CardTitle>Attributi di compliance</CardTitle>
          <CardDescription>Assegna i valori richiesti dal profilo aziendale per questo prodotto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {defs.length === 0 && <div className="text-sm text-muted-foreground">Nessun attributo configurato a livello aziendale.</div>}
          {defs.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {defs.map((d) => {
                const val = compLocal[d.key] ?? "";
                const onChange = (v: any) => setCompLocal((prev) => ({ ...prev, [d.key]: v }));
                return (
                  <div key={d.key} className="space-y-1">
                    <Label className="text-xs">
                      {d.label ?? d.key}{d.required ? " *" : ""}
                    </Label>

                    {d.type === "boolean" ? (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`comp_${d.key}`}
                          checked={!!val}
                          onCheckedChange={(c) => onChange(!!c)}
                        />
                        {d.desc && (
                          <Label htmlFor={`comp_${d.key}`} className="text-xs text-muted-foreground">{d.desc}</Label>
                        )}
                      </div>
                    ) : d.type === "select" && Array.isArray(d.options) ? (
                      <select
                        className="w-full h-9 rounded border bg-background"
                        value={String(val ?? "")}
                        onChange={(e) => onChange(e.target.value || undefined)}
                      >
                        <option value=""></option>
                        {d.options.map((o) => (
                          <option key={o.value} value={o.value}>{o.label ?? o.value}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type={d.type === "number" ? "number" : "text"}
                        value={String(val ?? "")}
                        onChange={(e) =>
                          onChange(d.type === "number" ? parseNumber(e.target.value) : e.target.value)
                        }
                        placeholder={d.desc}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="pt-1">
            <Button onClick={saveCompliance} disabled={savingComp}>Salva</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
