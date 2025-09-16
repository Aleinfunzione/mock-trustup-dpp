import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

import { useAuth } from "@/hooks/useAuth";
import { getActor } from "@/services/api/identity";
import BOMEditor from "@/components/products/BOMEditor";

import {
  createProduct,
  listProductTypes,
  type CreateProductInput,
} from "@/services/api/products";
import type { BomNode } from "@/types/product";
import type { ProductType } from "@/types/productType";
import type { Product } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/utils/constants";

type Props = {
  onCreated?: (p: Product) => void;
  onCancel?: () => void;
};

export default function ProductForm({ onCreated, onCancel }: Props) {
  const { currentUser } = useAuth();
  const actor = currentUser?.did ? getActor(currentUser.did) : undefined;
  const companyDid = currentUser?.companyDid ?? actor?.companyDid;

  // Categoria + Tipo
  const [categoryId, setCategoryId] = useState<string>(PRODUCT_CATEGORIES[0]?.id ?? "finished_good");
  const [types, setTypes] = useState<ProductType[]>([]);
  const [typeId, setTypeId] = useState<string>("generic");

  // Campi base
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [attributesText, setAttributesText] = useState<string>("{}");
  const [bom, setBom] = useState<BomNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carica i tipi per la categoria selezionata
  useEffect(() => {
    const t = listProductTypes(categoryId);
    setTypes(t);
    // Se l'attuale typeId non è più valido, scegli il primo disponibile; altrimenti fallback a "generic"
    if (!t.find((x) => x.id === typeId)) {
      setTypeId(t[0]?.id ?? "generic");
    }
  }, [categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // All'avvio: bootstrap tipi (senza categoria => compat)
  useEffect(() => {
    const t = listProductTypes(categoryId);
    setTypes(t);
    if (!t.find((x) => x.id === typeId)) {
      setTypeId(t[0]?.id ?? "generic");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedType = useMemo(
    () => types.find((t) => t.id === typeId),
    [types, typeId]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      if (!companyDid) throw new Error("Questo account non è associato ad alcuna azienda.");
      if (!currentUser?.did) throw new Error("Utente non autenticato.");
      if (!name.trim()) throw new Error("Inserisci il nome prodotto.");

      // parse JSON attributes
      let attrs: Record<string, any> = {};
      if (attributesText && attributesText.trim().length > 0) {
        try {
          attrs = JSON.parse(attributesText);
        } catch {
          throw new Error("Gli attributi non sono un JSON valido.");
        }
      }

      const payload: CreateProductInput = {
        companyDid,
        createdByDid: currentUser.did,
        name: name.trim(),
        sku: sku.trim() || undefined,
        typeId, // 🔴 vincolato al Tipo selezionato (filtrato per Categoria)
        attributes: attrs,
        bom,
      };

      const prod = (await Promise.resolve(createProduct(payload))) as Product;
      onCreated?.(prod);

      // reset form
      setName("");
      setSku("");
      setAttributesText("{}");
      setBom([]);
      // mantieni la categoria selezionata; resetta solo il typeId coerentemente
      const t = listProductTypes(categoryId);
      setTypes(t);
      setTypeId(t[0]?.id ?? "generic");
    } catch (e: any) {
      setError(e?.message ?? "Errore nella creazione del prodotto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuovo prodotto</CardTitle>
        <CardDescription>
          Crea un prodotto con attributi (JSON) e distinta base (BOM). La validazione AJV avviene lato servizio mock.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!companyDid ? (
          <p className="text-sm text-red-500">
            Questo account non è associato ad alcuna azienda. Non puoi creare prodotti.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="pf-name">Nome</Label>
                <Input
                  id="pf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Es. Bottiglia 1L"
                  disabled={saving}
                />
              </div>

              {/* SKU */}
              <div className="space-y-2">
                <Label htmlFor="pf-sku">SKU (opzionale)</Label>
                <Input
                  id="pf-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Es. BTL-1L-0001"
                  disabled={saving}
                />
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="pf-cat">Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId} disabled={saving}>
                  <SelectTrigger id="pf-cat" aria-label="Seleziona categoria">
                    <SelectValue placeholder="Seleziona una categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label htmlFor="pf-type">Tipo</Label>
                <Select value={typeId} onValueChange={setTypeId} disabled={saving || types.length === 0}>
                  <SelectTrigger id="pf-type" aria-label="Seleziona tipo">
                    <SelectValue placeholder="Seleziona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Nessun tipo disponibile</div>
                    ) : (
                      types.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.id})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Schema info */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center justify-between">
                  <span>Schema (solo info)</span>
                  {selectedType?.schema ? (
                    <span className="text-[11px] text-muted-foreground">JSON Schema presente</span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Nessuno</span>
                  )}
                </Label>
                <div className="text-xs max-h-32 overflow-auto rounded-md border p-2 font-mono bg-muted/40">
                  {selectedType?.schema ? JSON.stringify(selectedType.schema, null, 2) : "—"}
                </div>
              </div>
            </div>

            {/* Attributi JSON */}
            <div className="space-y-2">
              <Label htmlFor="pf-attrs">Attributi (JSON)</Label>
              <Textarea
                id="pf-attrs"
                value={attributesText}
                onChange={(e) => setAttributesText(e.target.value)}
                className="h-40 font-mono"
                placeholder='{"color":"red","weight":123}'
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Gli attributi saranno validati tramite AJV contro lo schema del tipo selezionato (mock).
              </p>
            </div>

            {/* BOM */}
            <BOMEditor value={bom} onChange={setBom} />

            {/* Errori */}
            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Azioni */}
            <div className="flex gap-2 justify-end">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                  Annulla
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? "Creo…" : "Crea prodotto"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
