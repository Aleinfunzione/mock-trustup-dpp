// src/components/products/productList.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { getActor } from "@/services/api/identity";
import { listProductsByCompany, deleteProduct, publishDPP } from "@/services/api/products";
import type { Product } from "@/types/product";

// Filtro isole globale
import { filterByIsland, subscribeIsland, getIslandFilter, type IslandFilterState } from "@/stores/uiStore";

type Props = {
  onCreateNew?: () => void;
  onOpenProduct?: (id: string) => void;
  readOnly?: boolean;
};

export default function ProductList({ onCreateNew, onOpenProduct, readOnly }: Props) {
  const { currentUser } = useAuth();
  const actor = currentUser?.did ? getActor(currentUser.did) : undefined;
  const companyDid = currentUser?.companyDid ?? actor?.companyDid;

  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // island filter state for re-render when it changes
  const [island, setIsland] = useState<IslandFilterState>(getIslandFilter());

  useEffect(() => {
    return subscribeIsland((s) => setIsland(s));
  }, []);

  // Base path per dettaglio/attributi
  const basePath =
    currentUser?.role === "company"
      ? "/company/products"
      : currentUser?.role === "creator"
      ? "/creator/products"
      : "/products";

  function refresh() {
    if (!companyDid) {
      setItems([]);
      return;
    }
    const data = listProductsByCompany(companyDid);
    setItems([...data].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyDid]);

  const islanded = useMemo(
    () => filterByIsland(items as Array<Product & { islandId?: string; data?: any }>),
    [items, island.enabled, island.islandId]
  );

  const filtered = useMemo(() => {
    if (!q.trim()) return islanded;
    const s = q.toLowerCase();
    return islanded.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.sku ?? "").toLowerCase().includes(s) ||
        p.id.toLowerCase().includes(s) ||
        p.typeId.toLowerCase().includes(s)
    );
  }, [islanded, q]);

  async function handleDelete(id: string) {
    const ok = window.confirm("Eliminare questo prodotto?");
    if (!ok) return;
    try {
      setBusyId(id);
      setError(null);
      await Promise.resolve(deleteProduct(id));
      refresh();
    } catch (e: any) {
      setError(e?.message ?? "Errore nell'eliminazione");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePublish(id: string) {
    try {
      setBusyId(id);
      setError(null);
      await Promise.resolve(publishDPP(id));
      refresh();
    } catch (e: any) {
      setError(e?.message ?? "Errore nella pubblicazione DPP");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prodotti</CardTitle>
        <CardDescription>
          Elenco dei prodotti della tua azienda{" "}
          {companyDid ? <span className="font-mono">{companyDid}</span> : "(azienda non associata)"}.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!companyDid ? (
          <p className="text-sm text-red-500">Questo account non è associato ad alcuna azienda.</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label>Cerca</Label>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, SKU, ID, Tipo…" />
              </div>
              {!readOnly && onCreateNew && (
                <div className="sm:ml-auto">
                  <Button onClick={onCreateNew}>Nuovo prodotto</Button>
                </div>
              )}
            </div>

            {/* Lista */}
            <div className="rounded-md border divide-y">
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Nessun prodotto{island.enabled && island.islandId ? ` per l’isola ${island.islandId}.` : "."}{" "}
                  {!readOnly && onCreateNew ? "Crea il primo con “Nuovo prodotto”." : ""}
                </div>
              ) : (
                filtered.map((p) => {
                  const islandId = (p as any).islandId as string | undefined;
                  return (
                    <div key={p.id} className="p-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {p.name} {p.sku ? <span className="text-muted-foreground">• {p.sku}</span> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: <span className="font-mono">{p.id}</span> • Tipo:{" "}
                          <span className="font-mono">{p.typeId}</span>
                          {islandId ? (
                            <>
                              {" "}
                              • Isola: <span className="font-mono">{islandId}</span>
                            </>
                          ) : null}
                        </div>
                        {p.isPublished ? (
                          <div className="text-xs text-green-500">
                            Pubblicato • DPP: <span className="font-mono">{p.dppId}</span>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Bozza</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Ultimo aggiornamento: {new Date(p.updatedAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button asChild variant="outline">
                          <Link to={`${basePath}/${p.id}/attributes`}>Caratteristiche</Link>
                        </Button>

                        {onOpenProduct ? (
                          <Button variant="outline" onClick={() => onOpenProduct(p.id)}>
                            Apri
                          </Button>
                        ) : (
                          <Button asChild variant="outline">
                            <Link to={`${basePath}/${p.id}`}>Apri</Link>
                          </Button>
                        )}

                        {!readOnly && !p.isPublished && (
                          <Button onClick={() => handlePublish(p.id)} disabled={busyId === p.id}>
                            {busyId === p.id ? "Pubblico…" : "Pubblica DPP"}
                          </Button>
                        )}
                        {!readOnly && (
                          <Button variant="destructive" onClick={() => handleDelete(p.id)} disabled={busyId === p.id}>
                            {busyId === p.id ? "Elimino…" : "Elimina"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
