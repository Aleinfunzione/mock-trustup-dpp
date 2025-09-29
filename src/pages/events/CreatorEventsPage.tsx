// src/pages/events/CreatorEventsPage.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/useAuth";
import { getActor } from "@/services/api/identity";
import { listProductsByCompany } from "@/services/api/products";
import * as productsApi from "@/services/api/products"; // per marcare il prodotto aggiornato (fallback dinamico)

import EventForm from "@/components/events/EventForm";
import EventTimeline from "@/components/events/EventTimeline";

type LiteProduct = { id: string; name: string; sku?: string; typeId?: string; updatedAt?: string };

// Best-effort: chiudo eventuali overlay/portal di librerie UI rimasti aperti quando si smonta la pagina
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
            // nasconde senza interferire con lo stato React
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

export default function CreatorEventsPage() {
  useCloseOverlaysOnUnmount();

  const { currentUser } = useAuth();
  const actor = currentUser?.did ? getActor(currentUser.did) : undefined;
  const companyDid = currentUser?.companyDid ?? actor?.companyDid;

  const [all, setAll] = React.useState<LiteProduct[]>([]);
  const [q, setQ] = React.useState("");
  const [productId, setProductId] = React.useState<string | undefined>(undefined);
  const [timelineKey, setTimelineKey] = React.useState(0);

  // carica lista prodotti della company
  React.useEffect(() => {
    if (!companyDid) {
      setAll([]);
      setProductId(undefined);
      return;
    }
    const data = listProductsByCompany(companyDid) as LiteProduct[];
    const sorted = [...data].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    setAll(sorted);
    if (!productId && sorted[0]) setProductId(sorted[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // al create evento → aggiorna timeline e (se possibile) marca il prodotto come aggiornato (DPP draft changed)
  async function handleEventCreated() {
    setTimelineKey((k) => k + 1);

    // best-effort: chiama eventuali funzioni del service per aggiornare updatedAt/aggregato
    try {
      const api: any = productsApi as any;
      const fn =
        api.markUpdated ??
        api.touch ??
        api.bumpUpdatedAt ??
        api.updateProduct ??
        api.save ??
        null;

      if (typeof fn === "function" && productId) {
        await Promise.resolve(fn(productId));
      }
    } catch {
      /* no-op */
    }

    // ricarica la lista per riflettere updatedAt
    if (companyDid) {
      const data = listProductsByCompany(companyDid) as LiteProduct[];
      setAll([...data].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")));
    }
  }

  return (
    // isolate + pointer events per impedire che overlay interni coprano la sidebar
    <div className="relative z-0 isolate [&_*]:pointer-events-auto space-y-6">
      {/* Selettore prodotto + filtro */}
      <Card>
        <CardHeader>
          <CardTitle>Eventi — Creator</CardTitle>
          <CardDescription>
            Seleziona un prodotto della tua azienda e registra un evento. Al salvataggio la timeline e il DPP (bozza) vengono aggiornati nel mock.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!companyDid ? (
            <p className="text-sm text-red-500">Account non associato ad alcuna azienda.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Filtro</Label>
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Nome, SKU, ID, Tipo…"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prodotto</Label>
                  <select
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                    value={productId ?? ""}
                    onChange={(e) => setProductId(e.target.value || undefined)}
                  >
                    {filtered.length === 0 ? (
                      <option value="">— Nessun prodotto —</option>
                    ) : (
                      filtered.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.sku ? `• ${p.sku}` : ""} — {p.id}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Form evento */}
              {productId ? (
                <div className="mt-4">
                  <EventForm
                    defaultProductId={productId}
                    onCreated={handleEventCreated}
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Seleziona un prodotto per continuare.</div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Timeline per il prodotto selezionato */}
      {productId && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline eventi</CardTitle>
          </CardHeader>
          <CardContent>
            <EventTimeline key={timelineKey} productId={productId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
