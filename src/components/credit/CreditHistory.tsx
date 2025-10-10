// src/components/credit/CreditHistory.tsx
import * as React from "react";
import { listTransactions, listAccounts } from "@/stores/creditStore";
import type { CreditTx } from "@/types/credit";
import { downloadCsv } from "@/utils/csv";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type TxType = "all" | "topup" | "transfer" | "consume";
const fmt = (n: unknown) => (typeof n === "number" ? n.toFixed(3).replace(/\.?0+$/, "") : String(n ?? ""));

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

export default function CreditHistory() {
  const accounts = listAccounts();
  const [accountId, setAccountId] = React.useState<string>("all");
  const [t, setT] = React.useState<TxType>("all");
  const { tx } = useTx(accountId === "all" ? undefined : accountId);
  const filtered = React.useMemo(() => tx.filter((x) => (t === "all" ? true : x.type === t)), [tx, t]);

  function exportCsv() {
    const rows = [
      ["id","ts","type","fromAccountId","toAccountId","amount","action","productId","eventId","islandId","postBalance","lowBalance","actor.ownerType","actor.ownerId"],
      ...filtered.map((x) => {
        const m: any = x.meta || {};
        const ref: any = m.ref || {};
        const actor: any = m.actor || {};
        return [x.id,x.ts,x.type,(x as any).fromAccountId ?? "",(x as any).toAccountId ?? "",fmt((x as any).amount),(x as any).action ?? "",ref.productId ?? "",ref.eventId ?? "",ref.islandId ?? "",fmt(m.postBalance),m.lowBalance ?? "",actor.ownerType ?? "",actor.ownerId ?? ""];
      }),
    ];
    downloadCsv(`credit_history${accountId === "all" ? "" : `_${accountId}`}.csv`, rows);
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Storico crediti • Export</CardTitle>
        <div className="flex gap-2">
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
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">ID</th><th className="py-2 pr-3">Quando</th><th className="py-2 pr-3">Tipo</th>
              <th className="py-2 pr-3">From</th><th className="py-2 pr-3">To</th><th className="py-2 pr-3">Importo</th>
              <th className="py-2 pr-3">Action</th><th className="py-2 pr-3">Prod</th><th className="py-2 pr-3">Evt</th>
              <th className="py-2 pr-3">Isola</th><th className="py-2 pr-3">Post bal.</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td className="py-4 text-muted-foreground" colSpan={11}>Nessuna transazione</td></tr>
            ) : filtered.slice().reverse().map((x) => {
              const m: any = x.meta || {}; const ref: any = m.ref || {};
              return (
                <tr key={x.id}>
                  <td className="py-1 pr-3 font-mono text-xs">{x.id}</td>
                  <td className="py-1 pr-3">{x.ts}</td>
                  <td className="py-1 pr-3">{x.type}</td>
                  <td className="py-1 pr-3">{(x as any).fromAccountId || ""}</td>
                  <td className="py-1 pr-3">{(x as any).toAccountId || ""}</td>
                  <td className="py-1 pr-3">{fmt((x as any).amount)}</td>
                  <td className="py-1 pr-3">{(x as any).action || ""}</td>
                  <td className="py-1 pr-3">{ref.productId || ""}</td>
                  <td className="py-1 pr-3">{ref.eventId || ""}</td>
                  <td className="py-1 pr-3">{ref.islandId || ""}</td>
                  <td className="py-1 pr-3">{fmt(m.postBalance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
