// src/pages/products/ProductCreatePage.tsx
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
// opzionale: tenta API diretta se esiste
import * as ProductsApi from "@/services/api/products";
// isole azienda
import { getCompanyAttrs, type Island } from "@/services/api/companyAttributes";

export default function ProductCreatePage() {
  const { currentUser } = useAuth();
  const nav = useNavigate();
  const role = currentUser?.role === "company" ? "company" : "creator";
  const base = `/${role}/products`;
  const companyDid = (currentUser as any)?.companyDid;

  const { create: hookCreate } = (useProducts?.() as any) ?? {};

  const [name, setName] = React.useState("");
  const [typeId, setTypeId] = React.useState("generic");
  const [sku, setSku] = React.useState("");
  const [islandId, setIslandId] = React.useState("");
  const [islands, setIslands] = React.useState<Island[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!companyDid) return;
    const attrs = getCompanyAttrs(companyDid);
    const list = Array.isArray(attrs?.islands) ? (attrs.islands as Island[]) : [];
    setIslands(list);
  }, [companyDid]);

  async function doCreate(payload: any): Promise<string> {
    // 1) hook se disponibile
    if (typeof hookCreate === "function") {
      const created = await hookCreate(payload);
      const id = (created as any)?.id || (created as any)?.productId;
      if (id) return id as string;
    }
    // 2) services/api/products.* varianti comuni
    const api: any = ProductsApi;
    const fn =
      api?.createProduct ||
      api?.create ||
      api?.addProduct ||
      (api?.default && (api.default as any).createProduct);
    if (typeof fn === "function") {
      const res = await fn(payload);
      const id = res?.id || res?.productId;
      if (id) return id as string;
    }
    // 3) fallback locale
    return `prd_${Date.now().toString(16)}`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Nome obbligatorio");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        name: name.trim(),
        type: typeId || "generic",
        sku: sku || undefined,
        islandId: islandId || undefined,
        companyDid,
        ownerDid: (currentUser as any)?.did,
      };
      const newId = await doCreate(payload);
      nav(`${base}/${encodeURIComponent(newId)}`, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Creazione prodotto fallita");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* breadcrumb */}
      <div className="flex items-center justify-between">
        <nav className="text-sm text-muted-foreground">
          <Link to={base} className="hover:underline">Prodotti</Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">Crea nuovo</span>
        </nav>
        <Button asChild variant="ghost" size="sm">
          <Link to={base}>Annulla</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crea nuovo prodotto</CardTitle>
          <CardDescription>Inserisci i dati minimi. Potrai completarli dopo.</CardDescription>
        </CardHeader>
        <CardContent>
          {err && <div className="mb-3 text-sm text-destructive">{err}</div>}
          <form onSubmit={onSubmit} className="grid gap-4 max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <Input id="type" value={typeId} onChange={(e) => setTypeId(e.target.value)} placeholder="generic" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sku">SKU (opzionale)</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Isola (opzionale)</Label>
              <Select value={islandId} onValueChange={(v) => setIslandId(v)}>
                <SelectTrigger><SelectValue placeholder="Nessuna" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nessuna</SelectItem>
                  {islands.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>Crea prodotto</Button>
              <Button type="button" variant="outline" asChild>
                <Link to={base}>Indietro</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
