import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";

// opzionale: tenta API diretta se esiste
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import * as ProductsApi from "@/services/api/products";

export default function ProductCreatePage() {
  const { currentUser } = useAuth();
  const nav = useNavigate();
  const role = currentUser?.role === "company" ? "company" : "creator";
  const base = `/${role}/products`;

  const { create: hookCreate } = useProducts?.() ?? ({} as any);

  const [name, setName] = React.useState("");
  const [typeId, setTypeId] = React.useState("generic");
  const [sku, setSku] = React.useState("");
  const [islandId, setIslandId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

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
    const fallbackId = `prd_${Date.now().toString(16)}`;
    return fallbackId;
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
        companyDid: (currentUser as any)?.companyDid,
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
              <Label htmlFor="island">Isola (opzionale)</Label>
              <Input id="island" value={islandId} onChange={(e) => setIslandId(e.target.value)} placeholder="island-id" />
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
