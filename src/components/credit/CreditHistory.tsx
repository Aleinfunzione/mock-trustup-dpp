// src/components/credit/CreditHistory.tsx
import * as React from "react";
import { listTransactions, listAccounts } from "@/stores/creditStore";
import type { CreditTx } from "@/types/credit";
import { downloadCreditTxCsv } from "@/utils/csv";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TxType = "all" | "topup" | "transfer" | "consume";
const fmt = (n: unknown) => (typeof n === "number" ? n.toFixed(3).replace(/\.?0+$/, "") : String(n ?? ""));
const UI_KEY = "trustup:creditsHistory:ui";

function useTx(accountId?: string) {
  const [tx, setTx] = React.useState<CreditTx[]>([]);
  const refresh = React.useCallback(() => {
    setTx(listTransactions(accountId ? { accountId } : undefined));
  }, [accountId]);
  React.useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => e.key?.includes("trustup:credits") && refresh();
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(refresh, 1500);
    return () => { window.removeEventListener("storage", onStorage); window.clearInterval(id); };
  }, [refresh]);
  return { tx };
}

function toMsStart(d?: string) { return d ? new Date(`${d}T00:00:00`).getTime() : undefined; }
function toMsEnd(d?: string)   { return d ? new Date(`${d}T23:59:59.999`).getTime() : undefined; }

function isActionType(t: string) {
  return t !== "topup" && t !== "transfer" && t !== "consume";
}

export default function CreditHistory() {
  const accounts = listAccounts();

  // ---- boot from query/localStorage ----
  const [booted, setBooted] = React.useState(false);
  const [accountId, setAccountId] = React.useState<string>("all");
  const [t, setT] = React.useState<TxType>("all");
  const [actorDid, setActorDid] = React.useState<string>("");
  const [islandFilter, setIslandFilter] = React.useState<string>("");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search || "");
      const savedRaw = localStorage.getItem(UI_KEY);
      const saved = savedRaw ? JSON.parse(savedRaw) : {};
      const pick = <T,>(k: string, fb: T): T => (params.get(k) as any) ?? (saved?.[k] as any) ?? fb;

      const acc = String(pick("account", "all"));
      setAccountId(acc && acc !== "undefined" ? acc : "all");

      const qsType = String(pick("type", "all"));
      if (qsType === "all" || qsType === "topup" || qsType === "transfer" || qsType === "consume") {
        setT(qsType);
      }

      setActorDid(String(pick("actor", "")));
      setIslandFilter(String(pick("islandId", "")));

      const f = String(pick("from", ""));
      const to = String(pick("to", ""));
      setFromDate(f);
      setToDate(to);
    } finally {
      setBooted(true);
    }
  }, []);

  // tx loading depends on accountId
  const { tx } = useTx(accountId === "all" ? undefined : accountId);

  // ---- persist to query + localStorage ----
  React.useEffect(() => {
    if (!booted || typeof window === "undefined") return;
    const state = { account: accountId, type: t, actor: actorDid, islandId: islandFilter, from: fromDate, to: toDate };
    try { localStorage.setItem(UI_KEY, JSON.stringify(state)); } catch {}
    try {
      const p = new URLSearchParams();
      if (accountId && accountId !== "all") p.set("account", accountId);
      if (t !== "all") p.set("type", t);
      if (actorDid) p.set("actor", actorDid);
      if (islandFilter) p.set("islandId", islandFilter);
      if (fromDate) p.set("from", fromDate);
      if (toDate) p.set("to", toDate);
      const qs = p.toString();
      const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      window.history.replaceState(null, "", url);
    } catch {}
  }, [booted, accountId, t, actorDid, islandFilter, fromDate, toDate]);

  // ---- filtering ----
  const filtered = React.useMemo(() => {
    const msFrom = toMsStart(fromDate);
    const msTo = toMsEnd(toDate);
    const actor = actorDid.trim().toLowerCase();
    const isl = islandFilter.trim();

    return tx.filter((x) => {
      if (t !== "all" && x.type !== t) {
        // include specific “action” types when user selects consume? keep strict for clarity
        return false;
      }

      const tsMs = new Date(x.ts).getTime();
      if (Number.isFinite(msFrom) && tsMs < (msFrom as number)) return false;
      if (Number.isFinite(msTo) && tsMs > (msTo as number)) return false;

      const m: any = x.meta || {};
      const ref: any = m.ref || {};
      if (actor) {
        const inMeta = (ref.actorDid || m.actor?.ownerId || "").toLowerCase();
        if (!inMeta.includes(actor)) return false;
      }
      if (isl) {
        const inIsl = String(ref.islandId || "");
        if (inIsl !== isl) return false;
      }
      return true;
    });
  }, [tx, t, actorDid, fromDate, toDate, islandFilter]);

  // ---- KPI ----
  const kpi = React.useMemo(() => {
    let spend = 0;
    let countEvents = 0;
    const byAction: Record<string, number> = {};
    const byIsland: Record<string, number> = {};
    const byActor: Record<string, number> = {};

    for (const x of filtered) {
      const m: any = x.meta || {};
      const ref: any = m.ref || {};
      const amount = Number((x as any).amount) || 0;
      const actionName = (x as any).action || (isActionType(x.type) ? x.type : "");

      const isSpend = x.type === "consume" || isActionType(x.type);
      if (isSpend) {
        spend += amount;
        countEvents++;
        if (actionName) byAction[actionName] = (byAction[actionName] || 0) + amount;
        const isl = String(ref.islandId || "");
        if (isl) byIsland[isl] = (byIsland[isl] || 0) + amount;
        const actor = String(ref.actorDid || m.actor?.ownerId || "");
        if (actor) byActor[actor] = (byActor[actor] || 0) + amount;
      }
    }

    const topN = (obj: Record<string, number>, n = 3) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

    return {
      spend,
      avg: countEvents ? spend / countEvents : 0,
      countEvents,
      topActions: topN(byAction),
      topIslands: topN(byIsland),
      topActors: topN(byActor),
    };
  }, [filtered]);

  function exportCsv() {
    const filename = `credit_history${accountId === "all" ? "" : `_${accountId}`}.csv`;
    downloadCreditTxCsv(filename, filtered, { bom: true, safeExcel: true });
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle>Storico crediti</CardTitle>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli account</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.ownerType}:{a.ownerId}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={t} onValueChange={(v: TxType) => setT(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutto</SelectItem>
                <SelectItem value="consume">Consume</SelectItem>
                <SelectItem value="topup">Topup</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>

            <Input
              className="w-44"
              placeholder="Actor DID"
              value={actorDid}
              onChange={(e) => setActorDid(e.target.value)}
            />

            <Input
              className="w-40"
              placeholder="Island ID"
              value={islandFilter}
              onChange={(e) => setIslandFilter(e.target.value)}
            />

            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-40"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label="Dal giorno"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="date"
                className="w-40"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                aria-label="Al giorno"
              />
            </div>

            <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid gap-2 sm:grid-cols-3 mt-2">
          <div className="text-sm">
            <div className="text-muted-foreground">Spesa periodo</div>
            <div className="font-mono">{fmt(kpi.spend)}</div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground"># eventi a costo</div>
            <div className="font-mono">{kpi.countEvents}</div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">Costo medio</div>
            <div className="font-mono">{fmt(kpi.avg)}</div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="text-xs">
            <div className="text-muted-foreground">Top azioni</div>
            <ul className="list-disc pl-4">
              {kpi.topActions.length ? kpi.topActions.map(([k, v]) => (
                <li key={k}><span className="font-mono">{k}</span>: {fmt(v)}</li>
              )) : <li className="text-muted-foreground">—</li>}
            </ul>
          </div>
          <div className="text-xs">
            <div className="text-muted-foreground">Top isole</div>
            <ul className="list-disc pl-4">
              {kpi.topIslands.length ? kpi.topIslands.map(([k, v]) => (
                <li key={k}><span className="font-mono">{k}</span>: {fmt(v)}</li>
              )) : <li className="text-muted-foreground">—</li>}
            </ul>
          </div>
          <div className="text-xs">
            <div className="text-muted-foreground">Top attori</div>
            <ul className="list-disc pl-4">
              {kpi.topActors.length ? kpi.topActors.map(([k, v]) => (
                <li key={k}><span className="font-mono">{k}</span>: {fmt(v)}</li>
              )) : <li className="text-muted-foreground">—</li>}
            </ul>
          </div>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">ID</th>
              <th className="py-2 pr-3">Quando</th>
              <th className="py-2 pr-3">Tipo</th>
              <th className="py-2 pr-3">From</th>
              <th className="py-2 pr-3">To</th>
              <th className="py-2 pr-3">Importo</th>
              <th className="py-2 pr-3">Prod</th>
              <th className="py-2 pr-3">Evt</th>
              <th className="py-2 pr-3">Actor</th>
              <th className="py-2 pr-3">Isola</th>
              <th className="py-2 pr-3">Bucket</th>
              <th className="py-2 pr-3">Post bal.</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td className="py-4 text-muted-foreground" colSpan={12}>Nessuna transazione</td></tr>
            ) : filtered.slice().reverse().map((x) => {
              const m: any = x.meta || {};
              const ref: any = m.ref || {};
              const post =
                m.balance_after ??
                m.postBalance ??
                m.postBalanceFrom ??
                m.postBalanceTo ??
                undefined;
              const bucketCharged = m.islandBucketCharged ? "✓" : "";
              return (
                <tr key={x.id} className="align-top">
                  <td className="py-1 pr-3 font-mono text-xs">{x.id}</td>
                  <td className="py-1 pr-3 whitespace-nowrap">{x.ts}</td>
                  <td className="py-1 pr-3">{(x as any).action || x.type}</td>
                  <td className="py-1 pr-3 font-mono text-xs truncate max-w-[220px] whitespace-nowrap overflow-hidden">
                    {(x as any).fromAccountId || ""}
                  </td>
                  <td className="py-1 pr-3 font-mono text-xs truncate max-w-[220px] whitespace-nowrap overflow-hidden">
                    {(x as any).toAccountId || ""}
                  </td>
                  <td className="py-1 pr-3">{fmt((x as any).amount)}</td>
                  <td className="py-1 pr-3">{ref.productId || ""}</td>
                  <td className="py-1 pr-3">{ref.eventId || ""}</td>
                  <td className="py-1 pr-3">{ref.actorDid || m.actor?.ownerId || ""}</td>
                  <td className="py-1 pr-3">{ref.islandId || ""}</td>
                  <td className="py-1 pr-3" title="Addebito da bucket isola">{bucketCharged}</td>
                  <td className="py-1 pr-3">{post !== undefined ? fmt(post) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
