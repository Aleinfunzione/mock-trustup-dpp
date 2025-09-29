import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { CompanyAttributes, Island, getCompanyAttrs, upsertIsland, removeIsland } from "@/services/api/companyAttributes";
import { nanoid } from "nanoid";

export default function CompanyIslandsPage() {
  const { currentUser } = useAuth();
  const companyDid = currentUser?.companyDid || currentUser?.did || "did:mock:company";
  const [data, setData] = React.useState<CompanyAttributes>({ islands: [] });
  const [editing, setEditing] = React.useState<Island | null>(null);

  React.useEffect(() => {
    setData(getCompanyAttrs(companyDid));
  }, [companyDid]);

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
        {(data.islands ?? []).map((isle) => (
          <Card key={isle.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{isle.name || "(senza nome)"}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {isle.lineId && <div>Linea: <span className="font-mono">{isle.lineId}</span></div>}
              <div>Macchine: {isle.machines?.length ?? 0}</div>
              <div>Turni: {isle.shifts?.length ?? 0}</div>
              <div>Contatori: {isle.energyMeters?.length ?? 0}</div>
              {isle.notes && <div className="text-muted-foreground">Note: {isle.notes}</div>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(isle)}>Modifica</Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(isle.id)}>Elimina</Button>
              </div>
            </CardContent>
          </Card>
        ))}
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
              <Button variant="outline" onClick={() => setEditing(null)}>Annulla</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
