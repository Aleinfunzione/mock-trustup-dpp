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

type Props = {
  /** facoltativo: callback per aprire il form di creazione */
  onCreateNew?: () => void;
  /** facoltativo: callback per aprire il dettaglio/modifica (se non passato, mostra link Dettaglio) */
  onOpenProduct?: (id: string) => void;
  /** sola lettura (es. vista Company) */
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

  // base path per il dettaglio prodotto in base al ruolo
  const detailBasePath =
    currentUser?.role === "company"
      ? "/company/products"
      : currentUser?.role === "creator"
      ? "/creator/products"
      : undefined;

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

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const s = q.toLowerCase();
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.sku ?? "").toLowerCase().includes(s) ||
        p.id.toLowerCase().includes(s) ||
        p.typeId.toLowerCase().includes(s)
    );
  }, [items, q]);

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
      await publishDPP(id);
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
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, SKU, ID, Type…" />
              </div>
              {!readOnly && (
                <div className="sm:ml-auto">
                  <Button onClick={onCreateNew} disabled={!onCreateNew}>
                    Nuovo prodotto
                  </Button>
                </div>
              )}
            </div>

            {/* Lista */}
            <div className="rounded-md border divide-y">
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Nessun prodotto. {readOnly ? "" : "Crea il primo con “Nuovo prodotto”."}
                </div>
              ) : (
                filtered.map((p) => (
                  <div key={p.id} className="p-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {p.name} {p.sku ? <span className="text-muted-foreground">• {p.sku}</span> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: <span className="font-mono">{p.id}</span> • Type:{" "}
                        <span className="font-mono">{p.typeId}</span>
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
                      {onOpenProduct ? (
                        <Button variant="outline" onClick={() => onOpenProduct(p.id)}>
                          Apri
                        </Button>
                      ) : detailBasePath ? (
                        <Button asChild variant="outline">
                          <Link to={`${detailBasePath}/${p.id}`}>Dettaglio</Link>
                        </Button>
                      ) : null}

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
                ))
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
