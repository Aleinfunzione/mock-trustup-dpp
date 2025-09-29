import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/hooks/useAuth";
import { getActor } from "@/services/api/identity";
import { listProductsByCompany } from "@/services/api/products";

import EventTimeline from "@/components/events/EventTimeline";

type LiteProduct = {
  id: string;
  name: string;
  sku?: string;
  typeId?: string;
  updatedAt?: string;
  isPublished?: boolean;
  dppId?: string;
};

// Best-effort: chiudo eventuali overlay/portal rimasti aperti quando si smonta la pagina
function useCloseOverlaysOnUnmount() {
  React.useEffect(() => {
    return () => {
      try {
        const selectors = [
          '[role="dialog"][data-state="open"]',
          '[data-state="open"][data-radix-popper-content-wrapper]',
          '[data-sonner]',
          '.fixed.inset-0[data-overlay]'
        ];
        document.querySelectorAll(selectors.join(",")).forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.pointerEvents = "none";
            el.style.display = "none";
          }
        });
      } catch {
        /* no-op */
      }
    };
  }, []);
}

export default function CompanyEventsPage() {
  useCloseOverlaysOnUnmount();

  const { currentUser } = useAuth();
  const actor = currentUser?.did ? getActor(currentUser.did) : undefined;
  const companyDid = currentUser?.companyDid ?? actor?.companyDid;

  const basePath = "/company/products";

  const [all, setAll] = React.useState<LiteProduct[]>([]);
  const [q, setQ] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  // carica prodotti dell'azienda
  React.useEffect(() => {
    if (!companyDid) {
      setAll([]);
      setExpanded(new Set());
      return;
    }
    const data = listProductsByCompany(companyDid) as LiteProduct[];
    const sorted = [...data].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    setAll(sorted);

    // per default, espandi il primo (se molti prodotti evita rumore)
    if (sorted[0]) setExpanded(new Set([sorted[0].id]));
  }, [companyDid]);

  const filtered = React.useMemo(() => {
    if (!q.trim()) return all;
    const s = q.toLowerCase();
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.sku ?? "").toLowerCase().includes(s) ||
        p.id.toLowerCase().includes(s) ||
        (p.typeId ?? "").toLowerCase().includes(s)
    );
  }, [all, q]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(filtered.map((p) => p.id)));
  }
  function collapseAll() {
    setExpanded(new Set());
  }

  return (
    // isolate + pointer events per impedire che overlay interni coprano la sidebar
    <div className="relative z-0 isolate [&_*]:pointer-events-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Eventi — Azienda</CardTitle>
          <CardDescription>
            Timeline degli eventi per tutti i prodotti dell’azienda{" "}
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
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Nome, SKU, ID, Tipo…"
                  />
                </div>
                <div className="sm:ml-auto flex gap-2">
                  <Button variant="outline" onClick={expandAll}>
                    Espandi tutto
                  </Button>
                  <Button variant="outline" onClick={collapseAll}>
                    Comprimi tutto
                  </Button>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nessun prodotto trovato.</div>
              ) : (
                <div className="space-y-4">
                  {filtered.map((p) => {
                    const isOpen = expanded.has(p.id);
                    return (
                      <Card key={p.id} className="border">
                        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <CardTitle className="text-base">
                              {p.name} {p.sku ? <span className="text-muted-foreground">• {p.sku}</span> : null}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              ID: <span className="font-mono">{p.id}</span> • Tipo:{" "}
                              <span className="font-mono">{p.typeId ?? "—"}</span> • Ultimo aggiornamento:{" "}
                              {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "—"}
                              {p.isPublished ? (
                                <>
                                  {" "}
                                  • <span className="text-green-600">Pubblicato</span> DPP:
                                  <span className="font-mono"> {p.dppId}</span>
                                </>
                              ) : (
                                <> • Bozza</>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link to={`${basePath}/${p.id}`}>Dettaglio</Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link to={`${basePath}/${p.id}/attributes`}>Caratteristiche</Link>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => toggle(p.id)}>
                              {isOpen ? "Comprimi" : "Espandi"}
                            </Button>
                          </div>
                        </CardHeader>
                        {isOpen && (
                          <CardContent>
                            <EventTimeline productId={p.id} />
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
