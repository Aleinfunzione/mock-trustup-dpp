// src/pages/company/CompanyTeamPage.tsx
import * as React from "react";
import CompanyMembersPanel from "@/components/company/CompanyMembersPanel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/authStore";

// Isole: stessa fonte dati della pagina "Isole"
import { getCompanyAttrs, type Island } from "@/services/api/companyAttributes";

// Mapping membro↔isola
import {
  getMemberIsland,
  setMemberIsland as setMemberIslandApi,
} from "@/services/api/identity";

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

type MemberAssignment = { did: string; islandId?: string; group?: string };

function actorLabel(a: Actor) {
  const nameCandidates = [
    a.displayName,
    [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || undefined,
    a.fullName,
    a.name,
    a.username,
    a.email ? String(a.email).split("@")[0] : undefined,
  ].filter(Boolean) as string[];
  return nameCandidates.find((s) => s && s !== a.did) || "Membro";
}

const isOpOrMachine = (r?: string) => r === "operator" || r === "machine";

// ---- identity members loader con fallback nomi funzione
import * as IdentityApi from "@/services/api/identity";
async function getCompanyMembers(companyDid: string): Promise<Actor[]> {
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

export default function CompanyTeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-muted-foreground">
          Crea o invita Creator / Operator / Machine della tua azienda.
        </p>
      </div>

      <CompanyMembersPanel />

      <AssignmentsSection />
    </div>
  );
}

/* ---------------- Assegnazioni attori → isole ---------------- */
function AssignmentsSection() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const companyDid = currentUser?.companyDid || currentUser?.did || "";

  const [members, setMembers] = React.useState<Actor[]>([]);
  const [islands, setIslands] = React.useState<Island[]>([]);
  const [assign, setAssign] = React.useState<Record<string, MemberAssignment>>({});
  const [draft, setDraft] = React.useState<Record<string, { islandId?: string; group?: string }>>({});
  const [loading, setLoading] = React.useState(false);

  const loadAll = React.useCallback(async () => {
    if (!companyDid) return;
    setLoading(true);
    try {
      const m = await getCompanyMembers(companyDid);

      // isole dalla stessa sorgente della pagina "Isole"
      const attrs = getCompanyAttrs(companyDid);
      const isl = Array.isArray(attrs?.islands) ? (attrs.islands as Island[]) : [];
      setIslands(isl);

      // inizializza assignments leggendo il mapping per ogni membro
      const onlyOpMach = m.filter((x) => isOpOrMachine(x.role));
      const idx: Record<string, MemberAssignment> = {};
      const d: Record<string, { islandId?: string; group?: string }> = {};
      for (const mem of onlyOpMach) {
        const mi = getMemberIsland(mem.did);
        idx[mem.did] = { did: mem.did, islandId: mi?.islandId, group: mi?.group };
        d[mem.did] = { islandId: mi?.islandId, group: mi?.group };
      }

      setMembers(onlyOpMach);
      setAssign(idx);
      setDraft(d);
    } finally {
      setLoading(false);
    }
  }, [companyDid]);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (!companyDid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assegnazioni a isole</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nessun DID azienda disponibile.
        </CardContent>
      </Card>
    );
  }

  function onChangeIsland(did: string, islandId?: string) {
    setDraft((prev) => ({ ...prev, [did]: { ...prev[did], islandId } }));
  }
  function onChangeGroup(did: string, group: string) {
    setDraft((prev) => ({ ...prev, [did]: { ...prev[did], group } }));
  }

  function isDirty(did: string) {
    const a = assign[did];
    const d = draft[did] || {};
    return (a?.islandId || "") !== (d.islandId || "") || (a?.group || "") !== (d.group || "");
  }

  async function onSave(did: string) {
    const d = draft[did] || {};
    try {
      setLoading(true);
      const saved = setMemberIslandApi(did, d.islandId, d.group);
      setAssign((prev) => ({ ...prev, [did]: { did, islandId: saved.islandId, group: saved.group } }));
      toast({ title: "Salvato", description: `${did} aggiornato` });
    } catch (e: any) {
      toast({ title: "Errore salvataggio", description: e?.message ?? "Impossibile salvare", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assegnazioni a isole e gruppi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nessun operatore o macchina.</div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground">
              <div className="col-span-4">Membro</div>
              <div className="col-span-4">Isola</div>
              <div className="col-span-3">Gruppo</div>
              <div className="col-span-1 text-right">Azioni</div>
            </div>

            {members.map((m) => {
              const d = draft[m.did] || {};
              return (
                <div key={m.did} className="grid grid-cols-12 gap-2 items-center py-2 border-b last:border-0">
                  <div className="col-span-4">
                    <div className="font-medium">{actorLabel(m)}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {m.role} · {m.did}
                    </div>
                  </div>

                  <div className="col-span-4">
                    <Label className="sr-only">Isola</Label>
                    <Select
                      value={d.islandId || ""}
                      onValueChange={(val) => onChangeIsland(m.did, val || undefined)}
                      disabled={loading}
                    >
                      <SelectTrigger aria-label="Seleziona isola">
                        <SelectValue placeholder="Nessuna" />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem key="none" value="">
                          Nessuna
                        </SelectItem>
                        {islands.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-3">
                    <Label className="sr-only">Gruppo</Label>
                    <Input
                      placeholder="Es. Linea A / Turno 1"
                      value={d.group || ""}
                      onChange={(e) => onChangeGroup(m.did, e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => onSave(m.did)}
                      disabled={loading || !isDirty(m.did)}
                    >
                      Salva
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
