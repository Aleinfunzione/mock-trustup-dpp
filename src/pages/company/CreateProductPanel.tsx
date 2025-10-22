// src/pages/company/products/CreateProductPanel.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { listProductTypes, createProduct } from "@/services/api/products";
import SchemaAttributesForm from "@/components/products/SchemaAttributesForm"; // stesso componente del Creator
import type { ProductType } from "@/types/productType";

export default function CreateProductPanel() {
  const { currentUser } = useAuthStore();
  const companyDid = currentUser?.companyDid ?? "";
  const createdByDid = currentUser?.did ?? "";

  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [typeId, setTypeId] = React.useState("generic");
  const [types, setTypes] = React.useState<ProductType[]>([]);
  const [schema, setSchema] = React.useState<any>(null);
  const [attributes, setAttributes] = React.useState<Record<string, any>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const all = listProductTypes();
    setTypes(all);
    const t = all.find((x) => x.id === typeId) || all[0] || null;
    setSchema(t?.schema ?? null);
  }, []);

  React.useEffect(() => {
    const all = listProductTypes();
    const t = all.find((x) => x.id === typeId) || null;
    setSchema(t?.schema ?? null);
    setAttributes({}); // reset quando cambia tipo
  }, [typeId]);

  async function onCreate() {
    setSaving(true);
    try {
      await createProduct({ companyDid, createdByDid, name, sku, typeId, attributes, bom: [] });
      setName(""); setSku(""); setAttributes({});
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Crea nuovo prodotto</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Bottiglia 1L" />
          </div>
          <div className="space-y-1">
            <Label>SKU (opz.)</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Es. BTL-1L-0001" />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <select
              className="w-full h-9 rounded border bg-background"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Schema (solo info)</Label>
            <pre className="text-[11px] p-2 rounded border overflow-auto bg-muted/30 h-24">
{JSON.stringify(schema ?? {}, null, 1)}
            </pre>
          </div>
        </div>

        <div className="text-sm font-medium">Attributi guidati</div>
        <SchemaAttributesForm schema={schema} value={attributes} onChange={setAttributes} />

        <div className="pt-2">
          <Button onClick={onCreate} disabled={saving || !companyDid || !name}>
            {saving ? "Creo…" : "Crea prodotto"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
