// src/pages/events/CreatorEventsPage.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/useAuth";
import { getActor } from "@/services/api/identity";
import { listProductsByCompany, getProduct as getProductSvc } from "@/services/api/products";
import * as productsApi from "@/services/api/products";
import EventForm from "@/components/events/EventForm";
import RawEventTimeline from "@/components/events/EventTimeline";
import { getCompanyAttrs } from "@/services/api/companyAttributes";
import { listAssignments } from "@/stores/orgStore";
import * as IdentityApi from "@/services/api/identity";

/* ---------------- shared types/utils ---------------- */
type LiteProduct = { id: string; name: string; sku?: string; typeId?: string; updatedAt?: string };
type Actor = {
  did: string; role?: string; displayName?: string; firstName?: string; lastName?: string;
  fullName?: string; name?: string; username?: string; email?: string;
};

function isOperatorRole(r?: string) {
  const x = (r || "").toLowerCase();
  return x.includes("operator") || x.includes("machine") || x.includes("macchin");
}
async function getCompanyActors(companyDid: string): Promise<Actor[]> {
  const api: any = IdentityApi as any;
  const fn = api.listCompanyMembers || api.listMembersByCompany || api.listByCompany || api.listMembers || api.list || null;
  try {
    const res = typeof fn === "function" ? fn(companyDid) : [];
    const arr = Array.isArray(res) ? res : await Promise.resolve(res);
    if (!Array.isArray(arr)) return [];
    return arr.map((a: any) => ({
      did: a.did || a.id || "",
      role: a.role || a.type || a.kind,
      displayName: a.displayName || a.name || a.fullName,
      firstName: a.firstName || a.givenName || a.nome,
      lastName: a.lastName || a.familyName || a.cognome,
      fullName: a.fullName, username: a.username, email: a.email,
    }));
  } catch { return []; }
}
function actorLabel(a: Actor) {
  const candidates = [
    a.displayName,
    [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || undefined,
    a.fullName, a.name, a.username, a.email ? String(a.email).split("@")[0] : undefined,
  ].filter(Boolean) as string[];
  const nm = candidates.find(Boolean) || "Operatore";
  const role = a.role ? ` • ${a.role}` : "";
  return `${nm} — ${a.did}${role}`;
}
function useCloseOverlaysOnUnmount() {
  React.useEffect(() => {
    return () => {
      try {
        const selectors = [
          '[role="dialog"][data-state="open"]',
          '[data-state="open"][data-radix-popper-content-wrapper]',
          '[data-sonner]', '.fixed.inset-0[data-overlay]',
        ];
        document.querySelectorAll(selectors.join(",")).forEach((el) => {
          if (el instanceof HTMLElement) { el.style.pointerEvents = "none"; el.style.display = "none"; }
        });
      } catch {}
    };
  }, []);
}

/* ---------------- shared data hook ---------------- */
function useCreatorData() {
  const { currentUser } = useAuth();
  const actor = currentUser?.did ? getActor(currentUser.did) : undefined;
  const companyDid = currentUser?.companyDid ?? actor?.companyDid;

  const [all, setAll] = React.useState<LiteProduct[]>([]);
  const [q, setQ] = React.useState("");
  const [productId, setProductId] = React.useState<string | undefined>(undefined);

  const [islands, setIslands] = React.useState<Array<{ id: string; name: string }>>([]);
  const [actors, setActors] = React.useState<Actor[]>([]);

  React.useEffect(() => {
    if (!companyDid) {
      setAll([]); setProductId(undefined); setIslands([]); return;
    }
    const data = listProductsByCompany(companyDid) as LiteProduct[];
    const sorted = [...data].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    setAll(sorted);
    if (!productId && sorted[0]) setProductId(sorted[0].id);

    const isl = getCompanyAttrs(companyDid)?.islands ?? [];
    setIslands(isl.map((i: any) => ({ id: i.id, name: i.name || i.id })));
  }, [companyDid]); // eslint-disable-line

  React.useEffect(() => {
    if (!companyDid) { setActors([]); return; }
    (async () => {
      const allActors = (await getCompanyActors(companyDid)).filter((a) => isOperatorRole(a.role));
      setActors(allActors);
    })();
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

  return { companyDid, all, filtered, q, setQ, productId, setProductId, islands, actors };
}

/* =========================================================
   KPI (index)
========================================================= */
export default function CreatorEventsKPI() {
  useCloseOverlaysOnUnmount();
  const { companyDid, filtered, q, setQ } = useCreatorData();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Eventi — KPI</CardTitle>
          <CardDescription>Panoramica e azioni rapide.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!companyDid ? (
            <p className="text-sm text-red-500">Account non associato ad alcuna azienda.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Filtro prodotti</Label>
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, SKU, ID, Tipo…" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="p-4"><div className="text-xs text-muted-foreground">Prodotti</div><div className="text-2xl font-semibold">{filtered.length}</div></Card>
                <Card className="p-4"><div className="text-xs text-muted-foreground">Azioni</div><div className="flex gap-2 mt-2">
                  <Button asChild variant="outline"><Link to="/creator/events/create">Registra evento</Link></Button>
                  <Button asChild variant="outline"><Link to="/creator/events/timeline">Apri timeline</Link></Button>
                </div></Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* =========================================================
   Registra evento
========================================================= */
export function CreatorEventsCreate() {
  useCloseOverlaysOnUnmount();
  const { companyDid, filtered, q, setQ, productId, setProductId } = useCreatorData();
  const [productIslandId, setProductIslandId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!productId) { setProductIslandId(undefined); return; }
    const p = getProductSvc(productId) as any;
    setProductIslandId(p?.islandId);
  }, [productId]);

  async function handleEventCreated() {
    try {
      const fn: any = (productsApi as any).markUpdated || (productsApi as any).touch || (productsApi as any).bumpUpdatedAt || (productsApi as any).updateProduct || (productsApi as any).save || null;
      if (typeof fn === "function" && productId) await Promise.resolve(fn(productId));
    } catch {}
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registra evento</CardTitle>
          <CardDescription>Seleziona un prodotto e compila il form.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!companyDid ? (
            <p className="text-sm text-red-500">Account non associato ad alcuna azienda.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Filtro prodotti</Label>
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, SKU, ID, Tipo…" />
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
                  {productIslandId && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Isola prodotto: <span className="font-mono">{productIslandId}</span>
                    </div>
                  )}
                </div>
              </div>

              {productId ? (
                <div className="mt-4">
                  <EventForm defaultProductId={productId} onCreated={handleEventCreated} />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Seleziona un prodotto per continuare.</div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* =========================================================
   Timeline
========================================================= */
export function CreatorEventsTimeline() {
  useCloseOverlaysOnUnmount();
  const { companyDid, filtered, q, setQ, productId, setProductId, islands, actors } = useCreatorData();
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>("");
  const [islandFilter, setIslandFilter] = React.useState<string>("");
  const [timelineKey, setTimelineKey] = React.useState(0);

  React.useEffect(() => { setTimelineKey((k) => k + 1); }, [productId, assigneeFilter, islandFilter]);

  const EventTimeline = RawEventTimeline as any;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Timeline eventi</CardTitle>
          <CardDescription>Filtra per prodotto, isola o assegnatario.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!companyDid ? (
            <p className="text-sm text-red-500">Account non associato ad alcuna azienda.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Filtro prodotti</Label>
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, SKU, ID, Tipo…" />
                  <select
                    className="mt-2 w-full h-9 rounded-md border bg-background px-3 text-sm"
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

                <div className="space-y-2">
                  <Label>Filtro isola</Label>
                  <Select value={islandFilter} onValueChange={setIslandFilter}>
                    <SelectTrigger aria-label="Filtro isola">
                      <SelectValue placeholder="Tutte" />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      <SelectItem value="">Tutte</SelectItem>
                      {islands.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name} ({i.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Filtro assegnatario</Label>
                  <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <SelectTrigger aria-label="Filtro assegnatario">
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      <SelectItem value="">Tutti</SelectItem>
                      {actors.map((a) => (
                        <SelectItem key={a.did} value={a.did}>
                          {actorLabel(a)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {productId ? (
                <Card className="mt-4">
                  <CardContent className="pt-4">
                    <EventTimeline
                      key={`${timelineKey}-${productId}-${islandFilter}-${assigneeFilter}`}
                      productId={productId}
                      filters={{ islandId: islandFilter || undefined, assignedToDid: assigneeFilter || undefined }}
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="text-sm text-muted-foreground">Seleziona un prodotto per continuare.</div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
