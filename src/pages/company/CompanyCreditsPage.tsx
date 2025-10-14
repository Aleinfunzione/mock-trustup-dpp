// src/pages/company/CompanyCreditsPage.tsx
import * as React from "react";
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
} from "@/services/api/credits";
import type { AccountOwnerType } from "@/types/credit";
import CreditsBadge from "@/components/credit/CreditsBadge";

// identity
import * as IdentityApi from "@/services/api/identity";
// eventi → seed isole
import { listEvents } from "@/services/api/events";
// bucket isole
import { getIslandBudget, setIslandBudget } from "@/stores/creditStore";

type Bal = { id: string; balance: number; low?: boolean };
type Actor = { did: string; role?: string; name?: string };
type IslandRow = { id: string; budget: number };

const UI_KEY = "trustup:companyCredits:ui";

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

  // ---- boot: querystring + localStorage ----
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search || "");
      const savedRaw = localStorage.getItem(UI_KEY);
      const saved = savedRaw ? JSON.parse(savedRaw) : {};
      const pick = <T,>(k: string, fallback: T): T => {
        const qs = params.get(k);
        return (qs as any) ?? (saved?.[k] as any) ?? fallback;
      };
      setOpDid(String(pick("op", "")));
      setMacDid(String(pick("mac", "")));
      setOtherDid(String(pick("oth", "")));
      const ot = String(pick("othType", "creator"));
      if (ot === "creator" || ot === "admin" || ot === "operator" || ot === "machine") setOtherType(ot as AccountOwnerType);
      setIslandId(String(pick("isl", "")));

      const n = (x: any, d: number) => {
        const v = Number(x);
        return Number.isFinite(v) && v >= 0 ? v : d;
      };
      setAmtOp(n(pick("amtOp", 10), 10));
      setAmtMac(n(pick("amtMac", 10), 10));
      setAmtOther(n(pick("amtOther", 10), 10));
      setAmtIsl(n(pick("amtIsl", 10), 10));
      setThr(n(pick("thr", 10), 10));
    } catch {}
  }, []);

  // init attori
  React.useEffect(() => {
    if (!companyDid) return;
    loadCompanyActors(companyDid).then((list) => {
      setMembers(list);
      if (!opDid) setOpDid(list.find(a => roleToOwnerType(a.role) === "operator")?.did || "");
      if (!macDid) setMacDid(list.find(a => roleToOwnerType(a.role) === "machine")?.did || "");
      if (!otherDid) setOtherDid(list.find(a => roleToOwnerType(a.role) === "creator")?.did || "");
    });
  }, [companyDid]); // eslint-disable-line react-hooks/exhaustive-deps

  // seed isole da eventi + budget attuale
  React.useEffect(() => {
    if (!companyDid) return;
    try {
      const evts = listEvents({ companyDid });
      const ids = Array.from(new Set(evts.map((e: any) => e.islandId || e.data?.islandId).filter(Boolean) as string[]));
      const rows = ids.map((id) => ({ id, budget: getIslandBudget(companyDid, id) }));
      setIslands(rows);
      if (!islandId) setIslandId(ids[0] || "");
    } catch {}
  }, [companyDid]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // persist UI state to localStorage + querystring
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const state = {
      op: opDid, mac: macDid, othType: otherType, oth: otherDid, isl: islandId,
      amtOp, amtMac, amtOther, amtIsl, thr: threshold,
    };
    try { localStorage.setItem(UI_KEY, JSON.stringify(state)); } catch {}
    try {
      const p = new URLSearchParams();
      if (opDid) p.set("op", opDid);
      if (macDid) p.set("mac", macDid);
      if (otherDid) p.set("oth", otherDid);
      if (otherType) p.set("othType", otherType);
      if (islandId) p.set("isl", islandId);
      p.set("amtOp", String(amtOp));
      p.set("amtMac", String(amtMac));
      p.set("amtOther", String(amtOther));
      p.set("amtIsl", String(amtIsl));
      p.set("thr", String(threshold));
      const qs = p.toString();
      const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      window.history.replaceState(null, "", url);
    } catch {}
  }, [opDid, macDid, otherType, otherDid, islandId, amtOp, amtMac, amtOther, amtIsl, threshold]);

  // helpers view
  const bal = (accId?: string) => (accId ? balances[accId]?.balance ?? 0 : 0);
  const accStr = (t: AccountOwnerType, did: string) => (did ? accountId(t, did) : "");

  // deep-link helpers
  const historyUrlForAccount = (acc?: string) =>
    acc ? `/company/credits/history?account=${encodeURIComponent(acc)}` : "#";
  const historyUrlForIsland = (id?: string) =>
    id ? `/company/credits/history?islandId=${encodeURIComponent(id)}` : "#";

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
          <div className="flex items-center justify-between">
            <CardTitle>Crediti azienda</CardTitle>
            {companyAcc && (
              <Button asChild variant="outline" size="sm">
                <a href={historyUrlForAccount(companyAcc)}>Vedi storico azienda</a>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Badges riepilogo */}
          <div className="flex flex-wrap items-center gap-2">
            <CreditsBadge actor={{ ownerType: "company", ownerId: companyDid }} showActor={false} />
            {opAcc && <CreditsBadge actor={{ ownerType: "operator", ownerId: opDid, companyId: companyDid }} showCompany={false} />}
            {macAcc && <CreditsBadge actor={{ ownerType: "machine", ownerId: macDid, companyId: companyDid }} showCompany={false} />}
            {othAcc && <CreditsBadge actor={{ ownerType: otherType, ownerId: otherDid, companyId: companyDid }} showCompany={false} />}
          </div>

          {/* Soglia low-balance */}
          <div className="rounded-md border p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Soglia low-balance</Label>
                <Input type="number" min={0} value={threshold} onChange={(e) => setThr(Number(e.target.value))} />
              </div>
              <div className="grid content-end gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={handleThresholdCompany} disabled={!companyAcc || loading}>
                  Imposta soglia
                </Button>
                {companyAcc && (
                  <Button asChild variant="ghost">
                    <a href={historyUrlForAccount(companyAcc)}>Vedi storico</a>
                  </Button>
                )}
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
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Trasferisci a operatore</div>
                {opAcc && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={historyUrlForAccount(opAcc)}>Vedi storico</a>
                  </Button>
                )}
              </div>
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
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input type="number" min={1} value={amtOp} onChange={(e) => setAmtOp(Number(e.target.value))} aria-label="Importo operatore" />
                <Button onClick={() => doTransfer("operator", opDid, amtOp, "company_to_operator")} disabled={!opDid || amtOp <= 0 || loading}>
                  Trasferisci
                </Button>
              </div>
            </div>

            {/* Macchina */}
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Trasferisci a macchina</div>
                {macAcc && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={historyUrlForAccount(macAcc)}>Vedi storico</a>
                  </Button>
                )}
              </div>
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
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input type="number" min={1} value={amtMac} onChange={(e) => setAmtMac(Number(e.target.value))} aria-label="Importo macchina" />
                <Button onClick={() => doTransfer("machine", macDid, amtMac, "company_to_machine")} disabled={!macDid || amtMac <= 0 || loading}>
                  Trasferisci
                </Button>
              </div>
            </div>

            {/* Altro */}
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Altro (creator/admin o DID manuale)</div>
                {othAcc && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={historyUrlForAccount(othAcc)}>Vedi storico</a>
                  </Button>
                )}
              </div>
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
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input type="number" min={1} value={amtOther} onChange={(e) => setAmtOther(Number(e.target.value))} aria-label="Importo altro" />
                <Button onClick={() => doTransfer(otherType, otherDid, amtOther, "company_to_member")} disabled={!otherDid || amtOther <= 0 || loading}>
                  Trasferisci
                </Button>
              </div>
            </div>

            {/* Bucket isola */}
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Bucket isola — ricarica veloce</div>
                {islandId && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={historyUrlForIsland(islandId)}>Vedi storico</a>
                  </Button>
                )}
              </div>
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
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input type="number" min={1} value={amtIsl} onChange={(e) => setAmtIsl(Number(e.target.value))} aria-label="Importo isola" />
                <Button onClick={topupIsland} disabled={!islandId || amtIsl <= 0 || loading}>
                  Ricarica bucket
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
