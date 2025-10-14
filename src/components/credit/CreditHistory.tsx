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

const UI_KEY = "trustup:creditHistory:ui";

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

function toMsStart(d?: string) {
  if (!d) return undefined;
  return new Date(`${d}T00:00:00`).getTime();
}
function toMsEnd(d?: string) {
  if (!d) return undefined;
  return new Date(`${d}T23:59:59.999`).getTime();
}

export default function CreditHistory() {
  const accounts = listAccounts();

  // boot from query/localStorage
  const [booted, setBooted] = React.useState(false);
  const [accountId, setAccountId] = React.useState<string>("all");
  const [t, setT] = React.useState<TxType>("all");
  const [actorDid, setActorDid] = React.useState<string>("");
  const [islandId, setIslandId] = React.useState<string>("");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search || "");
      const saved = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
      const pick = (k: string, fb: string) => (params.get(k) ?? saved[k] ?? fb) as string;
      setAccountId(pick("account", "all"));
      setT((pick("type", "all") as TxType) || "all");
      setActorDid(pick("actor", ""));
      setIslandId(pick("islandId", ""));
      setFromDate(pick("from", ""));
      setToDate(pick("to", ""));
    } finally { setBooted(true); }
  }, []);

  // persist to query/localStorage
  React.useEffect(() => {
    if (!booted || typeof window === "undefined") return;
    const state = { account: accountId, type: t, actor: actorDid, islandId, from: fromDate, to: toDate };
    try { localStorage.setItem(UI_KEY, JSON.stringify(state)); } catch {}
    const p = new URLSearchParams();
    if (accountId && accountId !== "all") p.set("account", accountId);
    if (t !== "all") p.set("type", t);
    if (actorDid) p.set("actor", actorDid);
    if (islandId) p.set("islandId", islandId);
    if (fromDate) p.set("from", fromDate);
    if (toDate) p.set("to", toDate);
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [booted, accountId, t, actorDid, islandId, fromDate, toDate]);

  const { tx } = useTx(accountId === "all" ? undefined : accountId);

  const filtered = React.useMemo(() => {
    const msFrom = toMsStart(fromDate);
    const msTo = toMsEnd(toDate);
    const actor = actorDid.trim().toLowerCase();
    const isl = islandId.trim();

    return tx.filter((x) => {
      if (t !== "all" && x.type !== t) return false;

      const tsMs = new Date(x.ts).getTime();
      if (Number.isFinite(msFrom) && tsMs < (msFrom as number)) return false;
      if (Number.isFinite(msTo) && tsMs > (msTo as number)) return false;

      const m: any = x.meta || {};
      if (actor) {
        const inMeta = (m.ref?.actorDid || m.actor?.ownerId || "").toLowerCase();
        if (!inMeta.includes(actor)) return false;
      }
      if (isl) {
        const islMeta = m.ref?.islandId || "";
        if (!String(islMeta).includes(isl)) return false;
      }

      return true;
    });
  }, [tx, t, actorDid, islandId, fromDate, toDate]);

  function exportCsv() {
    const filename = `credit_history${accountId === "all" ? "" : `_${accountId}`}.csv`;
    downloadCreditTxCsv(filename, filtered, { bom: true, safeExcel: true });
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            value={islandId}
            onChange={(e) => setIslandId(e.target.value)}
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
                  <td className="py-1 pr-3">{x.type}</td>
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
