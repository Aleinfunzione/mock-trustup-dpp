// src/pages/events/CompanyEventsPage.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

import { useAuthStore } from "@/stores/authStore";
import { listProductsByCompany } from "@/services/api/products";
import EventTimeline from "@/components/events/EventTimeline";

// Org: isole & assegnazioni
import { listIslands, listAssignments, type Island } from "@/stores/orgStore";

// Identity (fallback robusto)
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
    return arr
      .map((a: any) => ({
        did: a.did || a.id || "",
        role: a.role || a.type || a.kind,
        displayName: a.displayName || a.name || a.fullName,
        firstName: a.firstName || a.givenName,
        lastName: a.lastName || a.familyName,
        fullName: a.fullName,
        username: a.username,
        email: a.email,
      }))
      .filter((a) => isOperatorRole(a.role));
  } catch {
    return [];
  }
}

export default function CompanyEventsPage() {
  const { currentUser } = useAuthStore();
  const companyDid = currentUser?.companyDid || currentUser?.did || "";

  const [q, setQ] = React.useState("");
  const [products, setProducts] = React.useState<LiteProduct[]>([]);
  const [productId, setProductId] = React.useState<string>("");

  const [islands, setIslands] = React.useState<Island[]>([]);
  const [islandId, setIslandId] = React.useState<string>("");

  const [actors, setActors] = React.useState<Actor[]>([]);
  const [assignee, setAssignee] = React.useState<string>("");

  // Load prodotti dell’azienda
  React.useEffect(() => {
    if (!companyDid) {
      setProducts([]);
      setProductId("");
      return;
    }
    const data = (listProductsByCompany(companyDid) as LiteProduct[]) || [];
    const sorted = [...data].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    setProducts(sorted);
    if (!productId && sorted[0]) setProductId(sorted[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyDid]);

  // Load isole
  React.useEffect(() => {
    if (!companyDid) {
      setIslands([]);
      setIslandId("");
      return;
    }
    setIslands(listIslands(companyDid));
  }, [companyDid]);

  // Load attori (filtra per isola se selezionata)
  React.useEffect(() => {
    if (!companyDid) {
      setActors([]);
      return;
    }
    (async () => {
      const all = await getCompanyActors(companyDid);
      if (!islandId) {
        setActors(all);
        return;
      }
      const asg = listAssignments(companyDid);
      const allowed = new Set(asg.filter((a) => a.islandId === islandId).map((a) => a.did));
      const filtered = all.filter((a) => allowed.has(a.did));
      setActors(filtered.length ? filtered : all);
    })();
  }, [companyDid, islandId]);

  // Filtro prodotti testo libero
  const filteredProducts = React.useMemo(() => {
    if (!q.trim()) return products;
    const s = q.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.sku ?? "").toLowerCase().includes(s) ||
        p.id.toLowerCase().includes(s) ||
        (p.typeId ?? "").toLowerCase().includes(s)
    );
  }, [products, q]);

  const timelineFilters = React.useMemo(
    () => ({
      islandId: islandId || undefined,
      assignedToDid: assignee || undefined,
    }),
    [islandId, assignee]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Eventi — Azienda</CardTitle>
          <CardDescription>
            Vista generale degli eventi sui prodotti aziendali. Applica filtri per Prodotto, Isola o Assegnatario.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Filtro prodotti</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, SKU, ID, Tipo…" />
          </div>

          <div className="space-y-2">
            <Label>Prodotto</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger aria-label="Seleziona prodotto">
                <SelectValue placeholder="Seleziona un prodotto" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                {filteredProducts.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nessun prodotto</div>
                ) : (
                  filteredProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Isola</Label>
            <Select value={islandId} onValueChange={setIslandId}>
              <SelectTrigger aria-label="Filtra per isola">
                <SelectValue placeholder="Tutte" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="">Tutte</SelectItem>
                {islands.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assegnatario</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger aria-label="Filtra per assegnatario">
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
        </CardContent>
      </Card>

      {productId ? (
        <EventTimeline
          productId={productId}
          title="Timeline eventi (filtrata)"
          showVerify
          filters={timelineFilters}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Seleziona un prodotto per visualizzare la timeline.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
