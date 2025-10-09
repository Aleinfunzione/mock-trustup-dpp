// src/pages/company/CompanyIslandsPage.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  CompanyAttributes,
  Island,
  getCompanyAttrs,
  upsertIsland,
  removeIsland,
} from "@/services/api/companyAttributes";
import { listCompanyMembers, getMemberIsland } from "@/services/api/identity";
import { nanoid } from "nanoid";

type AssignStats = Record<
  string,
  {
    operators: number;
    machines: number;
    total: number;
  }
>;

export default function CompanyIslandsPage() {
  const { currentUser } = useAuth();
  const companyDid = currentUser?.companyDid || currentUser?.did || "did:mock:company";

  const [data, setData] = React.useState<CompanyAttributes>({ islands: [] });
  const [editing, setEditing] = React.useState<Island | null>(null);
  const [stats, setStats] = React.useState<AssignStats>({});

  // load islands
  React.useEffect(() => {
    setData(getCompanyAttrs(companyDid));
  }, [companyDid]);

  // compute assignment stats from identity mapping (Team page source of truth)
  React.useEffect(() => {
    async function compute() {
      const members: any[] = (await Promise.resolve(listCompanyMembers(companyDid))) || [];
      const s: AssignStats = {};
      for (const isle of data.islands ?? []) s[isle.id] = { operators: 0, machines: 0, total: 0 };

      for (const m of members) {
        if (m?.role !== "operator" && m?.role !== "machine") continue;
        const mi = getMemberIsland(m.did);
        const isleId = mi?.islandId;
        if (!isleId) continue;
        if (!s[isleId]) s[isleId] = { operators: 0, machines: 0, total: 0 };
        if (m.role === "operator") s[isleId].operators += 1;
        if (m.role === "machine") s[isleId].machines += 1;
        s[isleId].total += 1;
      }
      setStats(s);
    }
    compute();
  }, [companyDid, JSON.stringify((data.islands || []).map((i) => i.id))]);

  function onSave() {
    if (!editing) return;
    const clean: Island = { ...editing, name: editing.name.trim() };
    const next = upsertIsland(companyDid, clean);
    setData(next);
    setEditing(null);
  }

  function onDelete(id: string) {
    const next = removeIsland(companyDid, id);
    setData(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Isole aziendali</h1>
        <Button onClick={() => setEditing({ id: nanoid(), name: "", machines: [], shifts: [], energyMeters: [] })}>
          Nuova isola
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(data.islands ?? []).map((isle) => {
          const st = stats[isle.id] || { operators: 0, machines: 0, total: 0 };
          return (
            <Card key={isle.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{isle.name || "(senza nome)"}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {isle.lineId && (
                  <div>
                    Linea: <span className="font-mono">{isle.lineId}</span>
                  </div>
                )}
                <div>Operatori assegnati: {st.operators}</div>
                <div>Macchine assegnate: {st.machines}</div>
                <div className="text-muted-foreground">Membri totali assegnati: {st.total}</div>

                <div className="border-t pt-2" />

                <div>Turni: {isle.shifts?.length ?? 0}</div>
                <div>Contatori: {isle.energyMeters?.length ?? 0}</div>
                {isle.notes && <div className="text-muted-foreground">Note: {isle.notes}</div>}

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(isle)}>
                    Modifica
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(isle.id)}>
                    Elimina
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editing && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{editing.id ? "Modifica isola" : "Nuova isola"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome isola</Label>
              <Input id="name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lineId">Linea (opzionale)</Label>
              <Input id="lineId" value={editing.lineId ?? ""} onChange={(e) => setEditing({ ...editing, lineId: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Note</Label>
              <Input id="notes" value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={onSave}>Salva</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Annulla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
