// src/pages/company/products/CreateProductPanel.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { listProductTypes, createProduct } from "@/services/api/products";
import ProductAttributesForm from "@/components/products/ProductAttributesForm";
import type { ProductType } from "@/types/productType";

export default function CreateProductPanel() {
  const { currentUser } = useAuthStore();
  const companyDid = currentUser?.companyDid ?? "";
  const createdByDid = currentUser?.did ?? "";

  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [typeId, setTypeId] = React.useState("generic");
  const [types, setTypes] = React.useState<ProductType[]>([]);
  const [attributes, setAttributes] = React.useState<Record<string, any>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedType = React.useMemo(
    () => types.find((t) => t.id === typeId) || null,
    [types, typeId]
  );

  /* Load tipi al mount */
  React.useEffect(() => {
    const all = listProductTypes();
    setTypes(all);
    const def = all.find((x) => x.id === typeId) || all[0] || null;
    if (def && def.id !== typeId) setTypeId(def.id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Reset attributi quando cambia il tipo */
  React.useEffect(() => {
    setAttributes({});
  }, [typeId]);

  async function onCreate() {
    try {
      setSaving(true);
      setError(null);

      if (!companyDid) throw new Error("Account non associato ad alcuna azienda.");
      if (!createdByDid) throw new Error("Utente non autenticato.");
      if (!name.trim()) throw new Error("Inserisci il nome prodotto.");

      await createProduct({
        companyDid,
        createdByDid,
        name: name.trim(),
        sku: sku.trim() || undefined,
        typeId,
        attributes,
        bom: [],
      });

      setName("");
      setSku("");
      setAttributes({});
    } catch (e: any) {
      setError(e?.message ?? "Errore nella creazione del prodotto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea nuovo prodotto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Bottiglia 1L"
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label>SKU (opz.)</Label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Es. BTL-1L-0001"
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <select
              className="w-full h-9 rounded border bg-background"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              disabled={saving || types.length === 0}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Schema (solo info)</Label>
            <pre className="text-[11px] p-2 rounded border overflow-auto bg-muted/30 h-24">
{JSON.stringify(selectedType?.schema ?? {}, null, 1)}
            </pre>
          </div>
        </div>

        <div className="text-sm font-medium">Attributi guidati</div>
        <ProductAttributesForm
          typeId={typeId}
          value={attributes}
          onChange={setAttributes}
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="pt-2">
          <Button
            onClick={onCreate}
            disabled={saving || !companyDid || !name.trim()}
          >
            {saving ? "Creo…" : "Crea prodotto"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
