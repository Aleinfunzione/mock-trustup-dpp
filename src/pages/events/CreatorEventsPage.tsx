// src/pages/events/CreatorEventsPage.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

import { useAuth } from "@/hooks/useAuth";
import { getActor } from "@/services/api/identity";
import { listProductsByCompany, getProduct as getProductSvc } from "@/services/api/products";
import * as productsApi from "@/services/api/products";

import EventForm from "@/components/events/EventForm";
import RawEventTimeline from "@/components/events/EventTimeline";

// isole: fonte unica
import { getCompanyAttrs } from "@/services/api/companyAttributes";

// assignments per filtro assegnatario
import { listAssignments } from "@/stores/orgStore";

// identity fallback
import * as IdentityApi from "@/services/api/identity";

type LiteProduct = { id: string; name: string; sku?: string; typeId?: string; updatedAt?: string };
type Actor = {
  did: string;
  role?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  username?: string;
  email?: string;
};

function isOperatorRole(r?: string) {
  const x = (r || "").toLowerCase();
  return x.includes("operator") || x.includes("machine") || x.includes("macchin");
}

async function getCompanyActors(companyDid: string): Promise<Actor[]> {
  const api: any = IdentityApi as any;
  const fn =
    api.listCompanyMembers ||
    api.listMembersByCompany ||
    api.listByCompany ||
    api.listMembers ||
    api.list ||
    null;

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
      fullName: a.fullName,
      username: a.username,
      email: a.email,
    }));
  } catch {
    return [];
  }
}

function actorLabel(a: Actor) {
  const candidates = [
    a.displayName,
    [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || undefined,
    a.fullName,
    a.name,
    a.username,
    a.email ? String(a.email).split("@")[0] : undefined,
  ].filter(Boolean) as string[];
  const nm = candidates.find(Boolean) || "Operatore";
  const role = a.role ? ` • ${a.role}` : "";
  return `${nm} — ${a.did}${role}`;
}

// overlay cleanup
function useCloseOverlaysOnUnmount() {
  React.useEffect(() => {
    return () => {
      try {
        const selectors = [
          '[role="dialog"][data-state="open"]',
          '[data-state="open"][data-radix-popper-content-wrapper]',
          '[data-sonner]',
          '.fixed.inset-0[data-overlay]',
        ];
        document.querySelectorAll(selectors.join(",")).forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.pointerEvents = "none";
            el.style.display = "none";
          }
        });
      } catch {}
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

  const [islands, setIslands] = React.useState<Array<{ id: string; name: string }>>([]);
  const [islandFilter, setIslandFilter] = React.useState<string>("");

  const [actors, setActors] = React.useState<Actor[]>([]);
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>("");

  const [productIslandId, setProductIslandId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!companyDid) {
      setAll([]);
      setProductId(undefined);
      setIslands([]);
      return;
    }
    const data = listProductsByCompany(companyDid) as LiteProduct[];
    const sorted = [...data].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    setAll(sorted);
    if (!productId && sorted[0]) setProductId(sorted[0].id);

    // isole dalla stessa fonte
    const isl = getCompanyAttrs(companyDid)?.islands ?? [];
    setIslands(isl.map((i: any) => ({ id: i.id, name: i.name || i.id })));
  }, [companyDid]); // eslint-disable-line react-hooks/exhaustive-deps

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

  React.useEffect(() => {
    if (!productId) {
      setProductIslandId(undefined);
      return;
    }
    const p = getProductSvc(productId) as any;
    setProductIslandId(p?.islandId);
  }, [productId]);

  React.useEffect(() => {
    const cid = companyDid;
    if (!cid) return;
    (async () => {
      const allActors = (await getCompanyActors(cid)).filter((a) => isOperatorRole(a.role));
      if (!islandFilter) {
        setActors(allActors);
        return;
      }
      const asg = listAssignments(cid);
      const allowed = new Set(asg.filter((a) => a.islandId === islandFilter).map((a) => a.did));
      const filteredActors = allActors.filter((a) => allowed.has(a.did));
      setActors(filteredActors.length ? filteredActors : allActors);
    })();
  }, [companyDid, islandFilter]);

  async function handleEventCreated() {
    setTimelineKey((k) => k + 1);
    try {
      const api: any = productsApi as any;
      const fn =
        api.markUpdated ?? api.touch ?? api.bumpUpdatedAt ?? api.updateProduct ?? api.save ?? null;
      if (typeof fn === "function" && productId) await Promise.resolve(fn(productId));
    } catch {}
    if (companyDid) {
      const data = listProductsByCompany(companyDid) as LiteProduct[];
      setAll([...data].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")));
    }
  }

  const EventTimeline = RawEventTimeline as any;

  return (
    <div className="relative z-0 isolate [&_*]:pointer-events-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Eventi — Creator</CardTitle>
          <CardDescription>Seleziona un prodotto e registra un evento. Filtra la timeline per isola o assegnatario.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!companyDid ? (
            <p className="text-sm text-red-500">Account non associato ad alcuna azienda.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Filtro</Label>
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

              <div className="grid gap-3 sm:grid-cols-2">
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

      {productId && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline eventi</CardTitle>
          </CardHeader>
          <CardContent>
            <EventTimeline
              key={`${timelineKey}-${productId}-${islandFilter}-${assigneeFilter}`}
              productId={productId}
              filters={{ islandId: islandFilter || undefined, assignedToDid: assigneeFilter || undefined }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
