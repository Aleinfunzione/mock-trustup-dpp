// src/pages/company/CompanyEventsPage.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

import { useAuthStore } from "@/stores/authStore";
import { useProducts } from "@/hooks/useProducts";
import { getCompanyAttrs } from "@/services/api/companyAttributes";
import { listAssignments } from "@/stores/orgStore";
import * as IdentityApi from "@/services/api/identity";
import { useEvents } from "@/hooks/useEvents";
import EventTimeline from "@/components/events/EventTimeline";
import { downloadCsvFromObjects } from "@/utils/csv";
import type { Product } from "@/types/product";
import type { UIEvent } from "@/hooks/useEvents";
import { costOf } from "@/services/orchestration/creditsPublish";

type Actor = { did: string; role?: string; displayName?: string; firstName?: string; lastName?: string; email?: string };
type Island = { id: string; name: string };

const EVENT_COST = costOf("EVENT_CREATE" as any);

export default function CompanyEventsPage() {
  const { toast } = useToast();
  const { currentUser } = useAuthStore();
  const companyDid = currentUser?.companyDid || currentUser?.did || "";

  const { listMine } = useProducts();
  const { listByProduct } = useEvents();

  // prodotti
  const [products, setProducts] = React.useState<Product[]>([]);
  const [productId, setProductId] = React.useState<string>("");

  // isole e attori
  const [islands, setIslands] = React.useState<Island[]>([]);
  const [islandId, setIslandId] = React.useState<string>("");
  const [actors, setActors] = React.useState<Actor[]>([]);
  const [assignedToDid, setAssignedToDid] = React.useState<string>("");

  // filtro testo tipo
  const [text, setText] = React.useState("");
  const [typeText, setTypeText] = React.useState("");

  // grouping
  const [groupByIsland, setGroupByIsland] = React.useState<boolean>(false);

  // cache per export
  const [cached, setCached] = React.useState<UIEvent[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  // load prodotti
  React.useEffect(() => {
    try {
      const list = (listMine?.() as Product[]) || [];
      const sorted = [...list].sort((a: any, b: any) => (b?.updatedAt ?? "").localeCompare(a?.updatedAt ?? ""));
      setProducts(sorted);
      if (!productId && sorted.length) setProductId(sorted[0].id);
    } catch {
      setProducts([]);
    }
  }, [listMine]); // eslint-disable-line react-hooks/exhaustive-deps

  // load isole
  React.useEffect(() => {
    if (!companyDid) return;
    const isl = getCompanyAttrs(companyDid)?.islands ?? [];
    setIslands(isl.map((i: any) => ({ id: i.id, name: i.name || i.id })));
  }, [companyDid]);

  // load attori, opzionale filtro isola
  React.useEffect(() => {
    if (!companyDid) return;

    async function getCompanyActors(): Promise<Actor[]> {
      const api: any = IdentityApi as any;
      const fns = [
        "listCompanyMembers",
        "listMembersByCompany",
        "listByCompany",
        "listMembers",
        "list",
      ];
      for (const n of fns) {
        try {
          const fn = api?.[n];
          if (typeof fn !== "function") continue;
          const res = await Promise.resolve(fn(companyDid));
          if (Array.isArray(res)) {
            return res.map((a: any) => ({
              did: a.did || a.id || "",
              role: a.role || a.type || a.kind,
              displayName: a.displayName || a.name,
              firstName: a.firstName || a.givenName,
              lastName: a.lastName || a.familyName,
              email: a.email,
            }));
          }
        } catch {}
      }
      return [];
    }

    (async () => {
      const all = (await getCompanyActors()).filter((a) => {
        const r = (a.role || "").toLowerCase();
        return r.includes("operator") || r.includes("machine") || r.includes("macchin");
      });
      if (islandId) {
        const asg = listAssignments(companyDid);
        const allowed = new Set(asg.filter((a) => a.islandId === islandId).map((a) => a.did));
        const filtered = all.filter((a) => allowed.has(a.did));
        setActors(filtered.length ? filtered : all);
      } else {
        setActors(all);
      }
    })();
  }, [companyDid, islandId]);

  // carica e cache per export
  React.useEffect(() => {
    if (!productId) {
      setCached([]);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const list = await listByProduct(productId);
        if (!alive) return;
        // filtri soft per cache (stessi della timeline)
        const filtered = list.filter((e) => {
          const islOk = !islandId || ((e as any)?.data?.islandId === islandId);
          const asgOk = !assignedToDid || e.assignedToDid === assignedToDid;
          const typeOk = !typeText || e.type.toLowerCase().includes(typeText.toLowerCase());
          const textOk =
            !text ||
            (e.notes ?? "").toLowerCase().includes(text.toLowerCase()) ||
            ((e as any)?.data?.targetLabel ?? "").toLowerCase().includes(text.toLowerCase());
          return islOk && asgOk && typeOk && textOk;
        });
        setCached(filtered);
      } catch (err: any) {
        toast({
          title: "Errore lettura eventi",
          description: err?.message ?? "Impossibile caricare gli eventi.",
          variant: "destructive",
        });
        setCached([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [listByProduct, productId, islandId, assignedToDid, typeText, text, toast]);

  function actorLabel(a: Actor) {
    const name =
      a.displayName ||
      [a.firstName, a.lastName].filter(Boolean).join(" ").trim() ||
      (a.email ? a.email.split("@")[0] : undefined) ||
      "Operatore";
    return `${name} — ${a.did}`;
  }

  function exportCsv() {
    if (!cached.length) return;
    downloadCsvFromObjects(
      "company_events.csv",
      cached,
      [
        { key: "id", header: "id" },
        { key: "createdAt", header: "ts" },
        { key: "type", header: "type" },
        { key: "status", header: "status" },
        { key: "productId", header: "productId" },
        { key: "byDid", header: "byDid" },
        { key: "assignedToDid", header: "assignedToDid" },
        {
          key: "data",
          header: "islandId",
          map: (_v, it) => ((it as any).data?.islandId ?? "") as any,
        },
        {
          key: "data",
          header: "targetLabel",
          map: (_v, it) => ((it as any).data?.targetLabel ?? "") as any,
        },
        {
          key: "data",
          header: "txRef",
          map: (_v, it) => ((it as any).data?.txRef ?? "") as any,
        },
        { key: "notes", header: "notes" },
        { key: "type", header: "cost", map: () => EVENT_COST },
      ]
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Eventi — Azienda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs text-muted-foreground">
            Vista generale degli eventi sui prodotti aziendali. Applica filtri per Prodotto, Isola o Assegnatario.
          </div>

          {/* Filtro prodotti */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <Input placeholder="Nome, SKU, ID, Tipo..." disabled />
            </div>
            <div>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger aria-label="Prodotto">
                  <SelectValue placeholder="Seleziona prodotto" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  {products.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nessun prodotto</div>
                  ) : (
                    products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={islandId} onValueChange={(v) => { setIslandId(v); setAssignedToDid(""); }}>
                <SelectTrigger aria-label="Isola">
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="">Tutte</SelectItem>
                  {islands.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={assignedToDid} onValueChange={setAssignedToDid}>
                <SelectTrigger aria-label="Assegnatario">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="">Tutti</SelectItem>
                  {actors.map((a) => (
                    <SelectItem key={a.did} value={a.did}>{actorLabel(a)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtro testo/tipo + azioni */}
          <div className="grid gap-3 sm:grid-cols-4 items-end">
            <Input
              placeholder="Filtro tipo…"
              value={typeText}
              onChange={(e) => setTypeText(e.target.value)}
            />
            <Input
              placeholder="Cerca testo/note…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button
              variant={groupByIsland ? "default" : "outline"}
              onClick={() => setGroupByIsland((v) => !v)}
            >
              {groupByIsland ? "Raggruppo per isola" : "Vista unica"}
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!cached.length || loading}>
              Export CSV
            </Button>
          </div>

          {/* Timeline */}
          {productId ? (
            groupByIsland ? (
              islands.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nessuna isola definita.</div>
              ) : (
                islands.map((i) => (
                  <div key={i.id} className="mt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline">Isola</Badge>
                      <span className="font-mono text-sm">{i.id}</span>
                    </div>
                    <EventTimeline
                      productId={productId}
                      title="Timeline eventi (filtrata)"
                      filters={{
                        islandId: i.id,
                        assignedToDid: assignedToDid || undefined,
                      }}
                    />
                  </div>
                ))
              )
            ) : (
              <EventTimeline
                productId={productId}
                title="Timeline eventi (filtrata)"
                filters={{
                  islandId: islandId || undefined,
                  assignedToDid: assignedToDid || undefined,
                }}
              />
            )
          ) : (
            <div className="text-sm text-muted-foreground">Seleziona un prodotto.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
