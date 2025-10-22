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

// Identity API estesa
import * as IdentityApi from "@/services/api/identity";
import {
  getMemberIsland,
  setMemberIsland as setMemberIslandApi,
  listTeams,
  createTeam,
  assignMemberToTeam,
  getMemberTeamId,
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

type Team = IdentityApi.Team;

type MemberAssignment = { did: string; islandId?: string; group?: string; teamId?: string | null };

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
  const [reloadFlag, setReloadFlag] = React.useState(0);
  const bumpReload = () => setReloadFlag((v) => v + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-muted-foreground">Crea team e attori, poi assegna isole, gruppi e team.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamCreateSection onCreated={bumpReload} />
        <MemberCreateSection onCreated={bumpReload} />
      </div>

      <CompanyMembersPanel />

      <AssignmentsSection reloadFlag={reloadFlag} />
    </div>
  );
}

/* ---------------- Crea Team ---------------- */
function TeamCreateSection({ onCreated }: { onCreated?: () => void }) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const companyDid = currentUser?.companyDid || currentUser?.did || "";

  const [name, setName] = React.useState("");
  const [teams, setTeams] = React.useState<Team[]>([]);

  const reload = React.useCallback(() => {
    if (!companyDid) return;
    setTeams(listTeams(companyDid));
  }, [companyDid]);

  React.useEffect(reload, [reload]);

  async function onCreate() {
    if (!companyDid || !name.trim()) return;
    try {
      createTeam({ name: name.trim(), companyDid });
      setName("");
      reload();
      onCreated?.();
      toast({ title: "Team creato" });
    } catch (e: any) {
      toast({ title: "Errore", description: e?.message ?? "Impossibile creare team", variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea Team</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-5">
            <Label htmlFor="teamName">Nome team</Label>
            <Input id="teamName" placeholder="Es. Isola 1 / Linea A" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button onClick={onCreate} disabled={!name.trim() || !companyDid}>Crea</Button>
          </div>
        </div>

        {teams.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {teams.length} team attivi
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Crea Attore ---------------- */
function MemberCreateSection({ onCreated }: { onCreated?: () => void }) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const companyDid = currentUser?.companyDid || currentUser?.did || "";

  const [username, setUsername] = React.useState("");
  const [role, setRole] = React.useState<"creator" | "operator" | "machine">("creator");
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [teamId, setTeamId] = React.useState<string>("");

  React.useEffect(() => {
    if (!companyDid) return;
    setTeams(listTeams(companyDid));
  }, [companyDid]);

  async function onCreate() {
    if (!companyDid) return;
    try {
      const { record } = await IdentityApi.createInternalActor(companyDid, role, username.trim() || undefined);
      if (teamId) assignMemberToTeam(record.did, teamId);
      setUsername("");
      setRole("creator");
      setTeamId("");
      onCreated?.();
      toast({ title: "Attore creato", description: `${record.did}` });
    } catch (e: any) {
      toast({ title: "Errore", description: e?.message ?? "Impossibile creare attore", variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea Attore</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <Label>Username/Nome</Label>
          <Input placeholder="Es. Mario Rossi" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Ruolo</Label>
          <Select value={role} onValueChange={(v) => setRole(v as any)}>
            <SelectTrigger><SelectValue placeholder="Seleziona ruolo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="creator">Creator</SelectItem>
              <SelectItem value="operator">Operatore</SelectItem>
              <SelectItem value="machine">Macchinario</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-1">
          <Label>Team (opz.)</Label>
          <Select value={teamId} onValueChange={(v) => setTeamId(v)}>
            <SelectTrigger><SelectValue placeholder="Nessuno" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nessuno</SelectItem>
              {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-1 flex items-end">
          <Button onClick={onCreate} disabled={!companyDid}>Crea</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Assegnazioni attori → isole, gruppi, team ---------------- */
function AssignmentsSection({ reloadFlag }: { reloadFlag: number }) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const companyDid = currentUser?.companyDid || currentUser?.did || "";

  const [members, setMembers] = React.useState<Actor[]>([]);
  const [islands, setIslands] = React.useState<Island[]>([]);
  const [teams, setTeamsState] = React.useState<Team[]>([]);
  const [assign, setAssign] = React.useState<Record<string, MemberAssignment>>({});
  const [draft, setDraft] = React.useState<Record<string, { islandId?: string; group?: string; teamId?: string | null }>>({});
  const [loading, setLoading] = React.useState(false);

  const loadAll = React.useCallback(async () => {
    if (!companyDid) return;
    setLoading(true);
    try {
      const m = await getCompanyMembers(companyDid);

      // isole
      const attrs = getCompanyAttrs(companyDid);
      const isl = Array.isArray(attrs?.islands) ? (attrs.islands as Island[]) : [];
      setIslands(isl);

      // team
      const t = listTeams(companyDid);
      setTeamsState(t);

      // inizializza assignments leggendo mapping isola e team
      const onlyOpMach = m.filter((x) => isOpOrMachine(x.role));
      const idx: Record<string, MemberAssignment> = {};
      const d: Record<string, { islandId?: string; group?: string; teamId?: string | null }> = {};
      for (const mem of onlyOpMach) {
        const mi = getMemberIsland(mem.did);
        const teamId = getMemberTeamId(mem.did) ?? null;
        idx[mem.did] = { did: mem.did, islandId: mi?.islandId, group: mi?.group, teamId };
        d[mem.did] = { islandId: mi?.islandId, group: mi?.group, teamId };
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
  }, [loadAll, reloadFlag]);

  if (!companyDid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assegnazioni</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Nessun DID azienda disponibile.</CardContent>
      </Card>
    );
  }

  function onChangeIsland(did: string, islandId?: string) {
    setDraft((prev) => ({ ...prev, [did]: { ...prev[did], islandId } }));
  }
  function onChangeGroup(did: string, group: string) {
    setDraft((prev) => ({ ...prev, [did]: { ...prev[did], group } }));
  }
  function onChangeTeam(did: string, teamId?: string | null) {
    setDraft((prev) => ({ ...prev, [did]: { ...prev[did], teamId: teamId ?? null } }));
  }

  function isDirty(did: string) {
    const a = assign[did];
    const d = draft[did] || {};
    return (
      (a?.islandId || "") !== (d.islandId || "") ||
      (a?.group || "") !== (d.group || "") ||
      (a?.teamId || null) !== (d.teamId ?? null)
    );
  }

  async function onSave(did: string) {
    const d = draft[did] || {};
    try {
      setLoading(true);
      const saved = setMemberIslandApi(did, d.islandId, d.group);
      if ((assign[did]?.teamId ?? null) !== (d.teamId ?? null)) {
        assignMemberToTeam(did, d.teamId ?? null);
      }
      setAssign((prev) => ({
        ...prev,
        [did]: { did, islandId: saved.islandId, group: saved.group, teamId: d.teamId ?? null },
      }));
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
        <CardTitle>Assegnazioni a isole, team e gruppi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nessun operatore o macchina.</div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground">
              <div className="col-span-4">Membro</div>
              <div className="col-span-3">Isola</div>
              <div className="col-span-3">Team</div>
              <div className="col-span-1">Gruppo</div>
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

                  <div className="col-span-3">
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
                    <Label className="sr-only">Team</Label>
                    <Select
                      value={d.teamId ?? ""}
                      onValueChange={(val) => onChangeTeam(m.did, val || "")}
                      disabled={loading}
                    >
                      <SelectTrigger aria-label="Seleziona team">
                        <SelectValue placeholder="Nessuno" />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value="">Nessuno</SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1">
                    <Label className="sr-only">Gruppo</Label>
                    <Input
                      placeholder="Es. Turno 1"
                      value={d.group || ""}
                      onChange={(e) => onChangeGroup(m.did, e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Button size="sm" onClick={() => onSave(m.did)} disabled={loading || !isDirty(m.did)}>
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
