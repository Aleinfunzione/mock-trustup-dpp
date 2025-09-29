// src/components/products/AttributesAndCredentialsTab.tsx
import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import AttributeCatalogModal from "@/components/attributes/AttributeCatalogModal";
import AttributeFormDrawer from "@/components/attributes/AttributeFormDrawer";
import PillList from "@/components/attributes/PillList";

import { ATTRIBUTE_CATALOG, PillInstance } from "@/config/attributeCatalog";
import { aggregateAttributes } from "@/services/dpp/attributes";
import { addPill, updatePill, removePill, getProductById } from "@/services/api/products";

export interface AttributesAndCredentialsTabProps {
  productId: string;
}

type ProductLike = {
  id: string;
  name: string;
  attributesPills?: PillInstance[];
  dppDraft?: any;
};

function genId(): string {
  // compat con vecchi browser / typer
  // @ts-ignore
  return (crypto?.randomUUID?.() as string) ?? Math.random().toString(16).slice(2);
}

const AttributesAndCredentialsTab: React.FC<AttributesAndCredentialsTabProps> = ({ productId }) => {
  const feature = String(import.meta.env.VITE_FEATURE_ATTR_CATALOG);
  const [product, setProduct] = React.useState<ProductLike | null>(null);
  const [editing, setEditing] = React.useState<PillInstance | null>(null);

  const refresh = React.useCallback(() => {
    const p = getProductById(productId) as ProductLike | null;
    setProduct(p);
  }, [productId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const pills = product?.attributesPills ?? [];
  const aggregated = React.useMemo(
    () => product?.dppDraft ?? aggregateAttributes(pills),
    [product?.dppDraft, pills]
  );

  function handleSelectCatalog(catalogId: string) {
    if (!product) return;
    const entry = ATTRIBUTE_CATALOG.find((c) => c.id === catalogId);
    if (!entry) return;
    const newPill: PillInstance = {
      id: genId(),
      catalogId: entry.id,
      namespace: entry.namespace,
      version: entry.version,
      data: {},
      createdAt: new Date().toISOString(),
    };
    setEditing(newPill);
  }

  async function handleSavePillData(pill: PillInstance, data: any) {
    if (!product) return;
    const exists = (product.attributesPills || []).some((x) => x.id === pill.id);
    try {
      if (exists) {
        await Promise.resolve(updatePill(product.id, pill.id, data));
      } else {
        await Promise.resolve(addPill(product.id, { ...pill, data, updatedAt: new Date().toISOString() }));
      }
    } finally {
      setEditing(null);
      refresh();
    }
  }

  function handleEdit(pillId: string) {
    const p = pills.find((x) => x.id === pillId);
    if (p) setEditing(p);
  }

  async function handleRemove(pillId: string) {
    if (!product) return;
    await Promise.resolve(removePill(product.id, pillId));
    refresh();
  }

  if (feature !== "true") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Caratteristiche &amp; Credenziali</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Funzionalità disabilitata. Imposta <code>VITE_FEATURE_ATTR_CATALOG=true</code> nel tuo .env.
          </div>
        </CardContent>
      </Card>
    );
  }

  const editingCfg = editing ? ATTRIBUTE_CATALOG.find((c) => c.id === editing.catalogId) : null;

  return (
    <Tabs defaultValue="attributes">
      <TabsList>
        <TabsTrigger value="attributes">Caratteristiche</TabsTrigger>
        <TabsTrigger value="preview">JSON aggregato</TabsTrigger>
      </TabsList>

      <TabsContent value="attributes" className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground">
            Aggiungi “pillole” dal catalogo; il JSON aggregato aggiorna il DPP draft.
          </div>
          <div className="flex gap-2">
            <AttributeCatalogModal
              onSelect={(entry) => handleSelectCatalog(entry.id)}
              trigger={<Button size="sm">Aggiungi dal Catalogo</Button>}
            />
            <Button asChild size="sm" variant="outline">
              <a href="/creator/attributes">Apri Catalogo attributi</a>
            </Button>
          </div>
        </div>

        <PillList pills={pills} onEdit={handleEdit} onRemove={handleRemove} />

        {editing && editingCfg && (
          <AttributeFormDrawer
            open
            onClose={() => setEditing(null)}
            schemaPath={editingCfg.schemaPath}
            title={editingCfg.title}
            defaultValue={editing.data}
            onSubmit={(data) => handleSavePillData(editing, data)}
          />
        )}
      </TabsContent>

      <TabsContent value="preview" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Aggregato per namespace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium">gs1</div>
                <div className="border-t my-2" />
                <pre className="bg-muted p-3 rounded-xl overflow-auto text-xs">
{JSON.stringify(aggregated?.gs1 ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <div className="font-medium">iso</div>
                <div className="border-t my-2" />
                <pre className="bg-muted p-3 rounded-xl overflow-auto text-xs">
{JSON.stringify(aggregated?.iso ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <div className="font-medium">euDpp</div>
                <div className="border-t my-2" />
                <pre className="bg-muted p-3 rounded-xl overflow-auto text-xs">
{JSON.stringify(aggregated?.euDpp ?? {}, null, 2)}
                </pre>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Nota: i link a VC di Organizzazione/Eventi restano metadati esterni e non rientrano nel payload firmato della DPP.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default AttributesAndCredentialsTab;
