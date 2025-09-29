import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProductSelect from "@/components/products/ProductSelect";
import { loadSchema } from "@/services/schema/loader";
import { validateData } from "@/services/schema/validate";
import { addPill } from "@/services/api/products";

type SchemaKey = "euDpp" | "gs1" | "iso";
const SCHEMA_MAP: Record<SchemaKey, { title: string; path: string; std: "euDpp" | "gs1" | "iso" }> = {
  euDpp: { title: "DPP base", path: "/schemas/dpp_base.v1.json", std: "euDpp" },
  gs1: { title: "GS1 Electronics", path: "/schemas/gs1_electronics.v1.json", std: "gs1" },
  iso: { title: "ISO 14001 Cert.", path: "/schemas/iso_14001_certificate.v1.json", std: "iso" },
};

export default function CreatorAttributesCatalogPage() {
  const [productId, setProductId] = React.useState<string | undefined>();
  const [schemaKey, setSchemaKey] = React.useState<SchemaKey>("euDpp");
  const [schema, setSchema] = React.useState<any | null>(null);
  const [form, setForm] = React.useState<Record<string, any>>({});
  const [errors, setErrors] = React.useState<string | null>(null);
  const cfg = SCHEMA_MAP[schemaKey];

  React.useEffect(() => {
    loadSchema(cfg.path).then(setSchema);
    setForm({});
    setErrors(null);
  }, [schemaKey]);

  function onChangeField(k: string, v: any) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onAddAsPills() {
    if (!productId || !schema) return;
    const valid = validateData(schema, form) as { ok: boolean; message?: string };
        if (!valid.ok) {
        setErrors(valid.message ?? "Dati non validi per lo schema selezionato");
  return;
    }
    // Mapping semplice: ogni coppia chiave/valore → pillola
    const entries = Object.entries(form).filter(([, v]) => v !== undefined && v !== "");
    for (const [path, value] of entries) {
      await addPill(productId, {
        standard: cfg.std,
        path,          // es. "gtin" o "meta.productId"
        value,
      } as any);
    }
    setErrors(null);
    alert("Pillole aggiunte al prodotto.");
  }

  const topProps = Array.isArray(schema?.required) ? schema?.required : Object.keys(schema?.properties ?? {});
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Catalogo attributi</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Seleziona prodotto e schema</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Prodotto</Label>
            <ProductSelect value={productId} onChange={setProductId} placeholder="Seleziona prodotto" />
          </div>
          <div className="grid gap-2">
            <Label>Schema</Label>
            <select
              className="border rounded-md h-9 px-2 bg-background"
              value={schemaKey}
              onChange={(e) => setSchemaKey(e.target.value as SchemaKey)}
            >
              {Object.entries(SCHEMA_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.title}</option>
              ))}
            </select>
          </div>
          <div className="self-end">
            <Button onClick={onAddAsPills} disabled={!productId || !schema}>Aggiungi come pillole</Button>
          </div>
        </CardContent>
      </Card>

      {schema && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Compila campi ({cfg.title})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {topProps.slice(0, 24).map((k) => (
              <div className="grid gap-2" key={k}>
                <Label htmlFor={`f-${k}`}>{k}</Label>
                <Input
                  id={`f-${k}`}
                  placeholder={schema?.properties?.[k]?.description || ""}
                  value={form[k] ?? ""}
                  onChange={(e) => onChangeField(k, e.target.value)}
                />
              </div>
            ))}
            {errors && <div className="md:col-span-2 text-sm text-destructive">{errors}</div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
