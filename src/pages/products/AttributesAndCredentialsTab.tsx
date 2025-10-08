// src/components/products/AttributesAndCredentialsTab.tsx
import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  sku?: string;
  typeId?: string;
  attributes?: Record<string, any>;
  attributesPills?: PillInstance[];
  dppDraft?: any;
  updatedAt?: string;
};

function genId(): string {
  // @ts-ignore
  return (crypto?.randomUUID?.() as string) ?? Math.random().toString(16).slice(2);
}

const AttributesAndCredentialsTab: React.FC<AttributesAndCredentialsTabProps> = ({ productId }) => {
  const catalogEnabled = String(import.meta.env.VITE_FEATURE_ATTR_CATALOG) === "true";

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

  const editingCfg = editing ? ATTRIBUTE_CATALOG.find((c) => c.id === editing.catalogId) : null;

  return (
    <Tabs defaultValue="attributes">
      <TabsList>
        <TabsTrigger value="attributes">Caratteristiche</TabsTrigger>
        <TabsTrigger value="preview">JSON aggregato</TabsTrigger>
      </TabsList>

      {/* TAB: Caratteristiche */}
      <TabsContent value="attributes" className="mt-4 space-y-4">
        {/* Dettagli prodotto */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Dettagli prodotto</CardTitle>
            <CardDescription>ID: {product?.id}</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Nome</div>
              <div>{product?.name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">SKU</div>
              <div>{product?.sku ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tipo</div>
              <div>{product?.typeId ?? "—"}</div>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="text-xs text-muted-foreground">Ultimo aggiornamento</div>
              <div>{product?.updatedAt ?? "—"}</div>
            </div>
          </CardContent>
        </Card>

        {/* Attributi JSON nativi del prodotto */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Attributi</CardTitle>
              <CardDescription>JSON salvato sul prodotto</CardDescription>
            </div>
            <div className="flex gap-2">
              {catalogEnabled ? (
                <>
                  <AttributeCatalogModal
                    onSelect={(entry) => handleSelectCatalog(entry.id)}
                    trigger={<Button size="sm">Aggiungi dal Catalogo</Button>}
                  />
                  <Button asChild size="sm" variant="outline" title="Apri Catalogo attributi">
                    <a href={`/creator/attributes?productId=${productId}`}>Apri Catalogo attributi</a>
                  </Button>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">Catalogo attributi disabilitato</div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {product && product.attributes && Object.keys(product.attributes).length > 0 ? (
              <pre className="bg-muted p-3 rounded-xl overflow-auto text-xs">
{JSON.stringify(product.attributes, null, 2)}
              </pre>
            ) : (
              <div className="text-sm text-muted-foreground">
                Nessun attributo presente. Usa il Catalogo o modifica il prodotto per aggiungerli.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pillole del catalogo */}
        <Card>
          <CardHeader>
            <CardTitle>Pillole dal Catalogo</CardTitle>
            <CardDescription>Blocchi informativi strutturati collegati al prodotto</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </TabsContent>

      {/* TAB: JSON aggregato */}
      <TabsContent value="preview" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Aggregato per namespace</CardTitle>
            <CardDescription>
              Derivato dalle pillole del Catalogo{catalogEnabled ? "" : " (Catalogo disabilitato)"}
            </CardDescription>
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
              I riferimenti a VC di organizzazione o eventi restano metadati esterni e non entrano nel payload firmato della DPP.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default AttributesAndCredentialsTab;
