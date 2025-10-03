// src/components/credit/CreditsPanel.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  accountId,
  getBalances,            // <-- API: getBalances(accountIds: string[])
  listTransactions,       // <-- API: listTransactions({ accountId, limit })
  topupAccount,
  transferBetween,
  setThreshold,
} from "@/services/api/credits";
import type { AccountOwnerType } from "@/types/credit";

type ActorRef = {
  ownerType: AccountOwnerType;
  ownerId: string;
  companyId?: string;
};

type Props = {
  actor: ActorRef;
  allowTopupFromAdmin?: boolean;
  showHistoryLimit?: number;
};

export default function CreditsPanel({
  actor,
  allowTopupFromAdmin = true,
  showHistoryLimit = 10,
}: Props) {
  const companyAcc = actor.companyId ? accountId("company", actor.companyId) : undefined;
  const actorAcc = accountId(actor.ownerType, actor.ownerId);

  const [balances, setBalancesState] = React.useState<{ id: string; balance: number; low: boolean }[]>([]);
  const [amount, setAmount] = React.useState<string>("");
  const [threshold, setThr] = React.useState<string>("");
  const [target, setTarget] = React.useState<"company" | "actor">("company");
  const [history, setHistory] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    // saldi
    const ids = [actorAcc, ...(companyAcc ? [companyAcc] : [])];
    const raw = getBalances(ids) as Array<{ id: string; balance: number; low?: boolean }>;
    const next = raw.map((b) => ({
      id: b.id,
      balance: b.balance,
      low: typeof b.low === "boolean" ? b.low : b.balance <= 5,
    }));
    setBalancesState(next);

    // storico per account selezionato
    const filter = companyAcc ?? actorAcc;
    setHistory(listTransactions({ accountId: filter, limit: showHistoryLimit }));
  }, [actorAcc, companyAcc, showHistoryLimit]);

  React.useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes("creditsLedger")) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  async function doTopup() {
    if (!allowTopupFromAdmin) return;
    const n = parseInt(amount, 10);
    if (!Number.isInteger(n) || n <= 0) {
      setMsg("Importo non valido");
      return;
    }
    const toId = target === "company" ? companyAcc : actorAcc;
    if (!toId) {
      setMsg("Account di destinazione non trovato");
      return;
    }
    setBusy(true);
    try {
      topupAccount(toId, n, { reason: "manual_topup" });
      setAmount("");
      setMsg("Top-up eseguito");
      refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Errore top-up");
    } finally {
      setBusy(false);
    }
  }

  async function doTransfer(to: "company" | "actor") {
    const n = parseInt(amount, 10);
    if (!Number.isInteger(n) || n <= 0) {
      setMsg("Importo non valido");
      return;
    }
    const fromId = to === "company" ? actorAcc : companyAcc;
    const toId = to === "company" ? companyAcc : actorAcc;
    if (!fromId || !toId) {
      setMsg("Account non disponibile");
      return;
    }
    setBusy(true);
    try {
      transferBetween(fromId, toId, n, { reason: "manual_transfer" });
      setAmount("");
      setMsg("Trasferimento eseguito");
      refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Errore trasferimento");
    } finally {
      setBusy(false);
    }
  }

  async function applyThreshold(acc: "company" | "actor") {
    const n = parseInt(threshold, 10);
    if (!Number.isInteger(n) || n < 0) {
      setMsg("Soglia non valida");
      return;
    }
    const id = acc === "company" ? companyAcc : actorAcc;
    if (!id) return;
    try {
      setThreshold(id, n);
      setMsg("Soglia aggiornata");
      setThr("");
      refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Errore soglia");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crediti</CardTitle>
        <CardDescription>Saldo e operazioni base</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Saldi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {companyAcc && (
            <div className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">Azienda</div>
              <div className="text-2xl font-semibold">
                {balances.find((b) => b.id === companyAcc)?.balance ?? 0}
              </div>
            </div>
          )}
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">{labelFor(actor.ownerType)}</div>
            <div className="text-2xl font-semibold">
              {balances.find((b) => b.id === actorAcc)?.balance ?? 0}
            </div>
          </div>
        </div>

        {/* Top-up o trasferimenti */}
        <div className="space-y-2">
          <Label htmlFor="amount">Importo</Label>
          <Input
            id="amount"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="es. 10"
          />
          <div className="flex flex-wrap gap-2">
            {allowTopupFromAdmin && (
              <>
                <Button
                  variant={target === "company" ? "default" : "outline"}
                  onClick={() => setTarget("company")}
                  disabled={!companyAcc}
                >
                  Dest: Azienda
                </Button>
                <Button
                  variant={target === "actor" ? "default" : "outline"}
                  onClick={() => setTarget("actor")}
                >
                  Dest: Attore
                </Button>
                <Button onClick={doTopup} disabled={busy}>Top-up</Button>
              </>
            )}
            {companyAcc && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <Button onClick={() => doTransfer("actor")} disabled={busy}>Trasferisci → Attore</Button>
                <Button onClick={() => doTransfer("company")} disabled={busy}>Trasferisci → Azienda</Button>
              </>
            )}
          </div>
        </div>

        {/* Soglie */}
        <div className="space-y-2">
          <Label htmlFor="threshold">Soglia avviso</Label>
          <div className="flex gap-2">
            <Input
              id="threshold"
              inputMode="numeric"
              pattern="[0-9]*"
              value={threshold}
              onChange={(e) => setThr(e.target.value)}
              placeholder="es. 5"
              className="max-w-[10rem]"
            />
            <Button variant="outline" onClick={() => applyThreshold("actor")} disabled={busy}>
              Applica a attore
            </Button>
            {companyAcc && (
              <Button variant="outline" onClick={() => applyThreshold("company")} disabled={busy}>
                Applica a azienda
              </Button>
            )}
          </div>
        </div>

        {/* Storico */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Storico recente</div>
          <ul className="text-sm space-y-1 max-h-40 overflow-auto">
            {history.length === 0 && <li className="text-muted-foreground">Nessuna transazione</li>}
            {history.map((t: any) => (
              <li key={t.id} className="font-mono">
                {t.ts} · {t.type} · {t.amount}
                {t.action ? ` · ${t.action}` : ""}
              </li>
            ))}
          </ul>
        </div>

        {msg && <div className="text-xs text-muted-foreground">{msg}</div>}
      </CardContent>
    </Card>
  );
}

function labelFor(t: AccountOwnerType) {
  if (t === "creator") return "Creator";
  if (t === "operator") return "Operatore";
  if (t === "machine") return "Macchina";
  if (t === "company") return "Azienda";
  if (t === "admin") return "Admin";
  return t;
}
