// src/components/credit/CreditHistory.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { listTransactions, listAccounts } from "@/services/api/credits";
import type { CreditTx } from "@/types/credit";
import { downloadCreditTxCsv } from "@/utils/csv";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TxType = "all" | "topup" | "transfer" | "consume";

type Props = {
  account?: string;
  islandId?: string;
  txRef?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};

const fmt = (n: unknown) => (typeof n === "number" ? n.toFixed(3).replace(/\.?0+$/, "") : String(n ?? ""));

const UI_KEY = "trustup:creditHistory:ui";

function useTx(accountId?: string, limit?: number) {
  const [tx, setTx] = React.useState<CreditTx[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  const refresh = React.useCallback(() => {
    setLoading(true);
    try {
      const res = listTransactions(
        accountId ? { accountId, limit } : limit ? { limit } : undefined
      ) as unknown as CreditTx[];
      setTx(res || []);
    } finally {
      setLoading(false);
    }
  }, [accountId, limit]);

  React.useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => e.key?.startsWith("trustup:credits") && refresh();
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(refresh, 1500);
    return () => { window.removeEventListener("storage", onStorage); window.clearInterval(id); };
  }, [refresh]);

  return { tx, loading };
}

function toMsStart(d?: string) {
  if (!d) return undefined;
  return new Date(`${d}T00:00:00`).getTime();
}
function toMsEnd(d?: string) {
  if (!d) return undefined;
  return new Date(`${d}T23:59:59.999`).getTime();
}

export default function CreditHistory(props: Props) {
  const accounts = listAccounts();

  const controlled =
    props.account !== undefined ||
    props.islandId !== undefined ||
    props.txRef !== undefined ||
    props.dateFrom !== undefined ||
    props.dateTo !== undefined ||
    props.limit !== undefined;

  const [booted, setBooted] = React.useState(false);
  const [accountId, setAccountId] = React.useState<string>("all");
  const [t, setT] = React.useState<TxType>("all");
  const [actorDid, setActorDid] = React.useState<string>("");
  const [islandId, setIslandId] = React.useState<string>("");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [txRef, setTxRef] = React.useState<string>("");

  React.useEffect(() => {
    if (controlled) { setBooted(true); return; }
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
      setTxRef(pick("txRef", ""));
    } finally { setBooted(true); }
  }, [controlled]);

  React.useEffect(() => {
    if (controlled || !booted || typeof window === "undefined") return;
    const state = { account: accountId, type: t, actor: actorDid, islandId, from: fromDate, to: toDate, txRef };
    try { localStorage.setItem(UI_KEY, JSON.stringify(state)); } catch {}
    const p = new URLSearchParams();
    if (accountId && accountId !== "all") p.set("account", accountId);
    if (t !== "all") p.set("type", t);
    if (actorDid) p.set("actor", actorDid);
    if (islandId) p.set("islandId", islandId);
    if (fromDate) p.set("from", fromDate);
    if (toDate) p.set("to", toDate);
    if (txRef) p.set("txRef", txRef);
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [controlled, booted, accountId, t, actorDid, islandId, fromDate, toDate, txRef]);

  const effAccount = (controlled ? props.account : accountId) || "all";
  const effIsland = controlled ? (props.islandId ?? "") : islandId;
  const effFrom = controlled ? (props.dateFrom ?? "") : fromDate;
  const effTo = controlled ? (props.dateTo ?? "") : toDate;
  const effTxRef = controlled ? (props.txRef ?? "") : txRef;
  const effLimit = controlled ? (props.limit ?? 200) : 200;

  const { tx, loading } = useTx(effAccount === "all" ? undefined : effAccount, effLimit);

  const filtered = React.useMemo(() => {
    const msFrom = toMsStart(effFrom);
    const msTo = toMsEnd(effTo);
    const actor = actorDid.trim().toLowerCase();
    const isl = (effIsland || "").trim();
    const txNeedle = (effTxRef || "").trim();

    return (tx as CreditTx[]).filter((x) => {
      if (t !== "all" && x.type !== t) return false;

      const tsRaw: any = (x as any).ts || (x as any).createdAt || (x as any).timestamp;
      const tsMs = tsRaw ? new Date(tsRaw).getTime() : undefined;
      if (Number.isFinite(msFrom) && Number.isFinite(tsMs) && (tsMs as number) < (msFrom as number)) return false;
      if (Number.isFinite(msTo) && Number.isFinite(tsMs) && (tsMs as number) > (msTo as number)) return false;

      const m: any = x.meta || {};
      const ref: any = x.ref || m.ref || {};
      if (actor) {
        const inMeta = (m.ref?.actorDid || m.actor?.ownerId || ref.actorDid || "").toLowerCase();
        if (!inMeta.includes(actor)) return false;
      }
      if (isl) {
        const islMeta = ref.islandId || m.ref?.islandId || m.islandId || "";
        if (!String(islMeta).includes(isl)) return false;
      }
      if (txNeedle) {
        const tr = (x as any).txRef || ref.txRef || (x as any).ref || "";
        if (!String(tr).includes(txNeedle)) return false;
      }

      return true;
    });
  }, [tx, t, actorDid, effIsland, effFrom, effTo, effTxRef]);

  function exportCsv() {
    const filename = `credit_history${effAccount === "all" ? "" : `_${effAccount}`}.csv`;
    downloadCreditTxCsv(filename, filtered, { bom: true, safeExcel: true });
  }

  const historyLinkForTx = (tre: string) => `/company/credits/history?txRef=${encodeURIComponent(tre)}`;

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); } catch {}
  }

  return (
    <Card className="mt-6">
      <CardHeader className={`flex ${controlled ? "flex-row items-center justify-between" : "flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"}`}>
        <CardTitle>Storico crediti</CardTitle>

        {!controlled && (
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

            <Input
              className="w-48"
              placeholder="txRef"
              value={txRef}
              onChange={(e) => setTxRef(e.target.value)}
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
        )}
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
              <th className="py-2 pr-3">Payer</th>
              <th className="py-2 pr-3">Account</th>
              <th className="py-2 pr-3">txRef</th>
              <th className="py-2 pr-3">Prod</th>
              <th className="py-2 pr-3">Evt</th>
              <th className="py-2 pr-3">Actor</th>
              <th className="py-2 pr-3">Isola</th>
              <th className="py-2 pr-3">Bucket</th>
              <th className="py-2 pr-3">Post bal.</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr><td className="py-4 text-muted-foreground" colSpan={15}>Caricamento…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td className="py-4 text-muted-foreground" colSpan={15}>Nessuna transazione</td></tr>
            )}
            {!loading && filtered.length > 0 && filtered.slice().reverse().map((x) => {
              const m: any = x.meta || {};
              const ref: any = x.ref || m.ref || {};
              const post =
                m.balance_after ??
                m.postBalance ??
                m.postBalanceFrom ??
                m.postBalanceTo ??
                undefined;
              const bucketCharged = m.islandBucketCharged ? "✓" : "";
              const payerType = (x as any).payerType ?? m.payerType ?? "";
              const payerAccountId = (x as any).payerAccountId ?? m.payerAccountId ?? "";
              const tre = (x as any).txRef ?? ref.txRef ?? (x as any).ref ?? "";
              const when = (x as any).ts || (x as any).createdAt || (x as any).timestamp || "";

              return (
                <tr key={x.id} className="align-top">
                  <td className="py-1 pr-3 font-mono text-xs">{x.id}</td>
                  <td className="py-1 pr-3 whitespace-nowrap">{when}</td>
                  <td className="py-1 pr-3">{x.type}</td>
                  <td className="py-1 pr-3 font-mono text-xs truncate max-w-[220px] whitespace-nowrap overflow-hidden">
                    {(x as any).fromAccountId || ""}
                  </td>
                  <td className="py-1 pr-3 font-mono text-xs truncate max-w-[220px] whitespace-nowrap overflow-hidden">
                    {(x as any).toAccountId || ""}
                  </td>
                  <td className="py-1 pr-3">{fmt((x as any).amount)}</td>
                  <td className="py-1 pr-3">{payerType}</td>
                  <td className="py-1 pr-3 font-mono text-xs">{payerAccountId}</td>
                  <td className="py-1 pr-3 font-mono text-xs">
                    {tre ? (
                      <div className="flex items-center gap-2">
                        <Link className="underline" to={historyLinkForTx(tre)} title="Filtra per txRef">
                          {tre}
                        </Link>
                        {/* fix: size 'xs' non supportato da Button; uso 'sm' e compattazione styling */}
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => copy(String(tre))}>
                          Copia
                        </Button>
                      </div>
                    ) : ""}
                  </td>
                  <td className="py-1 pr-3">{ref.productId || ""}</td>
                  <td className="py-1 pr-3">{ref.eventId || ""}</td>
                  <td className="py-1 pr-3">{ref.actorDid || m.actor?.ownerId || ""}</td>
                  <td className="py-1 pr-3">{ref.islandId || m.islandId || ""}</td>
                  <td className="py-1 pr-3" title="Addebito da bucket isola">{bucketCharged}</td>
                  <td className="py-1 pr-3">{post !== undefined ? fmt(post) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="pt-3">
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
        </div>
      </CardContent>
    </Card>
  );
}
