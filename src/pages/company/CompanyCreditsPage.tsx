// src/pages/company/CompanyCreditsPage.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/components/ui/use-toast";
import {
  accountId,
  getBalances,
  transferBetween,
  setThreshold,
  ensureMemberAccount,
  // bucket isole (usa API, non lo store)
  getIslandBudget,
  setIslandBudget,
} from "@/services/api/credits";
import type { AccountOwnerType } from "@/types/credit";
import CreditsBadge from "@/components/credit/CreditsBadge";

// identity
import * as IdentityApi from "@/services/api/identity";
// eventi → seed isole
import { listEvents } from "@/services/api/events";

type Bal = { id: string; balance: number; low?: boolean };
type Actor = { did: string; role?: string; name?: string };

function roleToOwnerType(role?: string): AccountOwnerType {
  const r = (role || "").toLowerCase();
  if (r.includes("operator")) return "operator";
  if (r.includes("machine") || r.includes("macchin")) return "machine";
  if (r.includes("admin")) return "admin";
  return "creator";
}

async function loadCompanyActors(companyDid: string): Promise<Actor[]> {
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
        name:
          a.displayName ||
          [a.firstName, a.lastName].filter(Boolean).join(" ").trim() ||
          a.fullName ||
          a.username ||
          a.email ||
          "Membro",
      }))
      .filter((x: Actor) => x.did);
  } catch {
    return [];
  }
}

type IslandRow = { id: string; budget: number };

export default function CompanyCreditsPage() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  const companyDid = currentUser?.companyDid || currentUser?.did || "";
  const companyAcc = companyDid ? accountId("company", companyDid) : "";

  // soglia
  const [threshold, setThr] = React.useState<number>(10);

  // importi
  const [amtOp, setAmtOp] = React.useState<number>(10);
  const [amtMac, setAmtMac] = React.useState<number>(10);
  const [amtOther, setAmtOther] = React.useState<number>(10);
  const [amtIsl, setAmtIsl] = React.useState<number>(10);

  // attori
  const [members, setMembers] = React.useState<Actor[]>([]);
  const operators = React.useMemo(() => members.filter(m => roleToOwnerType(m.role) === "operator"), [members]);
  const machines  = React.useMemo(() => members.filter(m => roleToOwnerType(m.role) === "machine"), [members]);
  const creators  = React.useMemo(() => members.filter(m => roleToOwnerType(m.role) === "creator"), [members]);

  const [opDid, setOpDid] = React.useState<string>("");
  const [macDid, setMacDid] = React.useState<string>("");
  const [otherType, setOtherType] = React.useState<AccountOwnerType>("creator");
  const [otherDid, setOtherDid] = React.useState<string>("");

  // isole
  const [islands, setIslands] = React.useState<IslandRow[]>([]);
  const [islandId, setIslandId] = React.useState<string>("");

  // bilanci selezionati
  const [balances, setBalances] = React.useState<Record<string, Bal>>({});
  const [loading, setLoading] = React.useState(false);

  // init attori
  React.useEffect(() => {
    if (!companyDid) return;
    loadCompanyActors(companyDid).then((list) => {
      setMembers(list);
      setOpDid(list.find(a => roleToOwnerType(a.role) === "operator")?.did || "");
      setMacDid(list.find(a => roleToOwnerType(a.role) === "machine")?.did || "");
      setOtherDid(list.find(a => roleToOwnerType(a.role) === "creator")?.did || "");
    });
  }, [companyDid]);

  // seed isole da eventi + budget attuale
  React.useEffect(() => {
    if (!companyDid) return;
    try {
      const evts = listEvents({ companyDid });
      const ids = Array.from(new Set(evts.map((e: any) => e.islandId || e.data?.islandId).filter(Boolean) as string[]));
      const rows = ids.map((id) => ({ id, budget: getIslandBudget(companyDid, id) }));
      setIslands(rows);
      setIslandId(ids[0] || "");
    } catch {}
  }, [companyDid]);

  // refresh bilanci per gli account correnti
  const refreshBalances = React.useCallback(() => {
    const ids: string[] = [companyAcc];
    if (opDid)    ids.push(accountId("operator", opDid));
    if (macDid)   ids.push(accountId("machine", macDid));
    if (otherDid) ids.push(accountId(otherType, otherDid));
    const list = getBalances(ids).reduce<Record<string, Bal>>((m, b) => { m[b.id] = b as Bal; return m; }, {});
    setBalances(list);
  }, [companyAcc, opDid, macDid, otherDid, otherType]);

  React.useEffect(() => { if (companyAcc) refreshBalances(); }, [refreshBalances]);

  // helpers view
  const bal = (accId?: string) => (accId ? balances[accId]?.balance ?? 0 : 0);
  const accStr = (t: AccountOwnerType, did: string) => (did ? accountId(t, did) : "");
  const historyForAccount = (acc?: string) => (acc ? `/company/credits/history?account=${encodeURIComponent(acc)}` : "#");
  const historyForIsland  = (isl?: string) => (isl ? `/company/credits/history?islandId=${encodeURIComponent(isl)}` : "#");

  // actions
  async function handleThresholdCompany() {
    if (!companyAcc) return;
    setLoading(true);
    try {
      setThreshold(companyAcc, Math.max(0, Math.floor(threshold)));
      toast({ title: "Soglia azienda aggiornata" });
      refreshBalances();
    } catch (e: any) {
      toast({ title: "Errore soglia", description: e?.message ?? "Impossibile salvare", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function doTransfer(t: AccountOwnerType, did: string, amount: number, reason: string) {
    if (!companyAcc || !did || amount <= 0) return;
    setLoading(true);
    try {
      await ensureMemberAccount(t, did, 0);
      transferBetween(companyAcc, accountId(t, did), Math.floor(amount), { reason });
      toast({ title: "Trasferimento effettuato" });
      refreshBalances();
    } catch (e: any) {
      toast({ title: "Errore trasferimento", description: e?.message ?? "Impossibile trasferire", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function topupIsland() {
    if (!companyDid || !islandId || amtIsl <= 0) return;
    try {
      const cur = getIslandBudget(companyDid, islandId);
      const next = Math.max(0, cur + Math.floor(amtIsl));
      setIslandBudget(companyDid, islandId, next);
      toast({ title: "Bucket isola ricaricato", description: `${islandId} → ${next}` });
      setIslands((rows) => rows.map(r => r.id === islandId ? ({ ...r, budget: next }) : r));
    } catch (e: any) {
      toast({ title: "Errore bucket isola", description: e?.message ?? "Impossibile salvare", variant: "destructive" });
    }
  }

  const companyBal = bal(companyAcc);
  const opAcc = accStr("operator", opDid);
  const macAcc = accStr("machine", macDid);
  const othAcc = otherDid ? accStr(otherType, otherDid) : "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crediti azienda</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Badges riepilogo + link storico */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <CreditsBadge actor={{ ownerType: "company", ownerId: companyDid, companyId: companyDid }} />
              {companyAcc && (
                <Button asChild size="sm" variant="outline">
                  <Link to={historyForAccount(companyAcc)}>Vedi storico</Link>
                </Button>
              )}
            </div>
            {opAcc && (
              <div className="flex items-center gap-2">
                <CreditsBadge actor={{ ownerType: "operator", ownerId: opDid, companyId: companyDid }} showCompany={false} />
                <Button asChild size="sm" variant="outline">
                  <Link to={historyForAccount(opAcc)}>Vedi storico</Link>
                </Button>
              </div>
            )}
            {macAcc && (
              <div className="flex items-center gap-2">
                <CreditsBadge actor={{ ownerType: "machine", ownerId: macDid, companyId: companyDid }} showCompany={false} />
                <Button asChild size="sm" variant="outline">
                  <Link to={historyForAccount(macAcc)}>Vedi storico</Link>
                </Button>
              </div>
            )}
            {othAcc && (
              <div className="flex items-center gap-2">
                <CreditsBadge actor={{ ownerType: otherType, ownerId: otherDid, companyId: companyDid }} showCompany={false} />
                <Button asChild size="sm" variant="outline">
                  <Link to={historyForAccount(othAcc)}>Vedi storico</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Soglia low-balance */}
          <div className="rounded-md border p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Soglia low-balance</Label>
                <Input type="number" min={0} value={threshold} onChange={(e) => setThr(Number(e.target.value))} />
              </div>
              <div className="grid content-end">
                <Button variant="outline" onClick={handleThresholdCompany} disabled={!companyAcc || loading}>
                  Imposta soglia
                </Button>
              </div>
              <div className="grid content-end text-xs text-muted-foreground">
                <div>Azienda: <span className="font-mono">{companyBal}</span></div>
              </div>
            </div>
          </div>

          {/* Griglia operazioni */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Operatore */}
            <div className="rounded-md border p-4 space-y-3">
              <div className="text-sm font-medium">Trasferisci a operatore</div>
              <Select value={opDid} onValueChange={(v) => setOpDid(v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona operatore" /></SelectTrigger>
                <SelectContent className="z-[60]">
                  {operators.length ? operators.map(o => (
                    <SelectItem key={o.did} value={o.did}>{o.name} — {o.did}</SelectItem>
                  )) : <div className="px-3 py-2 text-sm text-muted-foreground">Nessun operatore</div>}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground font-mono">
                {opAcc || "—"} {opAcc ? `• saldo ${bal(opAcc)}` : ""}
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <Input type="number" min={1} value={amtOp} onChange={(e) => setAmtOp(Number(e.target.value))} aria-label="Importo operatore" />
                <Button onClick={() => doTransfer("operator", opDid, amtOp, "company_to_operator")} disabled={!opDid || amtOp <= 0 || loading}>
                  Trasferisci
                </Button>
                {opAcc && (
                  <Button asChild variant="outline">
                    <Link to={historyForAccount(opAcc)}>Vedi storico</Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Macchina */}
            <div className="rounded-md border p-4 space-y-3">
              <div className="text-sm font-medium">Trasferisci a macchina</div>
              <Select value={macDid} onValueChange={(v) => setMacDid(v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona macchina" /></SelectTrigger>
                <SelectContent className="z-[60]">
                  {machines.length ? machines.map(m => (
                    <SelectItem key={m.did} value={m.did}>{m.name} — {m.did}</SelectItem>
                  )) : <div className="px-3 py-2 text-sm text-muted-foreground">Nessuna macchina</div>}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground font-mono">
                {macAcc || "—"} {macAcc ? `• saldo ${bal(macAcc)}` : ""}
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <Input type="number" min={1} value={amtMac} onChange={(e) => setAmtMac(Number(e.target.value))} aria-label="Importo macchina" />
                <Button onClick={() => doTransfer("machine", macDid, amtMac, "company_to_machine")} disabled={!macDid || amtMac <= 0 || loading}>
                  Trasferisci
                </Button>
                {macAcc && (
                  <Button asChild variant="outline">
                    <Link to={historyForAccount(macAcc)}>Vedi storico</Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Altro */}
            <div className="rounded-md border p-4 space-y-3">
              <div className="text-sm font-medium">Altro (creator/admin o DID manuale)</div>
              <div className="grid sm:grid-cols-3 gap-2">
                <Select value={otherType} onValueChange={(v: AccountOwnerType) => setOtherType(v)}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creator">creator</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                    <SelectItem value="operator">operator</SelectItem>
                    <SelectItem value="machine">machine</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={otherDid} onValueChange={setOtherDid}>
                  <SelectTrigger><SelectValue placeholder="Seleziona DID" /></SelectTrigger>
                  <SelectContent className="max-h-72 overflow-auto">
                    {(otherType === "creator" ? creators
                      : otherType === "operator" ? operators
                      : otherType === "machine" ? machines
                      : members).map(m => (
                        <SelectItem key={m.did} value={m.did}>{m.name} — {m.did}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input placeholder="…o DID manuale" value={otherDid} onChange={(e) => setOtherDid(e.target.value)} />
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {othAcc || "—"} {othAcc ? `• saldo ${bal(othAcc)}` : ""}
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <Input type="number" min={1} value={amtOther} onChange={(e) => setAmtOther(Number(e.target.value))} aria-label="Importo altro" />
                <Button onClick={() => doTransfer(otherType, otherDid, amtOther, "company_to_member")} disabled={!otherDid || amtOther <= 0 || loading}>
                  Trasferisci
                </Button>
                {othAcc && (
                  <Button asChild variant="outline">
                    <Link to={historyForAccount(othAcc)}>Vedi storico</Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Bucket isola */}
            <div className="rounded-md border p-4 space-y-3">
              <div className="text-sm font-medium">Bucket isola — ricarica veloce</div>
              <Select value={islandId} onValueChange={setIslandId}>
                <SelectTrigger><SelectValue placeholder="Seleziona isola" /></SelectTrigger>
                <SelectContent>
                  {islands.length ? islands.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.id}</SelectItem>
                  )) : <div className="px-3 py-2 text-sm text-muted-foreground">Nessuna isola</div>}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Budget attuale: <span className="font-mono">{islandId ? getIslandBudget(companyDid, islandId) : 0}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <Input type="number" min={1} value={amtIsl} onChange={(e) => setAmtIsl(Number(e.target.value))} aria-label="Importo isola" />
                <Button onClick={topupIsland} disabled={!islandId || amtIsl <= 0 || loading}>
                  Ricarica bucket
                </Button>
                {islandId && (
                  <Button asChild variant="outline">
                    <Link to={historyForIsland(islandId)}>Vedi storico</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
