// src/components/events/TelemetryViewer.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { simulate as simulateCredits, spend as spendCredits } from "@/services/api/credits";
import { useAuthStore } from "@/stores/authStore";
import type { AccountOwnerType, ConsumeActor, CreditAction, ConsumeResult } from "@/types/credit";

type TelemetryRecord = {
  ts: string | number | Date;
  value: Record<string, any>;
};

type TelemetryViewerProps = {
  telemetry: TelemetryRecord[];
  productId?: string;
  eventId?: string;   // se presente, usato per idempotenza
  islandId?: string;
  compact?: boolean;
};

function fmtCredits(n: number) {
  if (!Number.isFinite(n)) return String(n);
  const s = n.toFixed(3);
  return s.replace(/\.?0+$/, "");
}

function normalizeTs(x: string | number | Date) {
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? String(x) : d.toLocaleString();
}

export default function TelemetryViewer({
  telemetry,
  productId,
  eventId,
  islandId,
  compact,
}: TelemetryViewerProps) {
  const { toast } = useToast();
  const { currentUser } = useAuthStore();

  const qty = Array.isArray(telemetry) ? telemetry.length : 0;

  const [simCost, setSimCost] = React.useState<number>(0);
  const [canPay, setCanPay] = React.useState<boolean>(true);
  const [pending, setPending] = React.useState(false);

  const actor: ConsumeActor | null = React.useMemo(() => {
    if (!currentUser?.did) return null;
    const u: any = currentUser;
    return {
      ownerType: (currentUser?.role ?? "company") as AccountOwnerType,
      ownerId: (u?.id ?? u?.did) as string,
      companyId: (u?.companyId ?? u?.companyDid) as string | undefined,
    };
  }, [currentUser?.did, currentUser?.role, (currentUser as any)?.companyId, (currentUser as any)?.companyDid]);

  // Simula costo totale per il batch
  React.useEffect(() => {
    if (!actor || qty <= 0) {
      setSimCost(0);
      setCanPay(true);
      return;
    }
    try {
      const sim = simulateCredits("TELEMETRY_PACKET" as CreditAction, actor, qty);
      setSimCost(sim.cost || 0);
      setCanPay(!!sim.payer);
    } catch {
      setSimCost(0);
      setCanPay(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor?.ownerId, actor?.companyId, qty]);

  if (!telemetry || telemetry.length === 0) {
    return <div className="text-sm text-muted-foreground">Nessuna telemetria disponibile.</div>;
  }

  async function handleCharge() {
    if (!actor) {
      toast({ title: "Utente non autenticato", description: "Effettua il login.", variant: "destructive" });
      return;
    }
    if (qty <= 0) return;

    setPending(true);
    try {
      // dedup: preferisci eventId; fallback su primo ts + qty
      const firstTs = telemetry[0]?.ts ? String(telemetry[0].ts) : "na";
      const dedup = `TELEMETRY_PACKET:${eventId || firstTs}:${qty}`;

      const res = spendCredits(
        "TELEMETRY_PACKET" as CreditAction,
        actor,
        {
          kind: "telemetry",
          productId,
          eventId,
          islandId,
          actorDid: actor.ownerId,
          batch: { count: qty, firstTs },
        } as any,
        qty,
        dedup
      ) as ConsumeResult;

      if (res.ok === false) {
        const msg =
          res.reason === "INSUFFICIENT_FUNDS"
            ? "Crediti insufficienti"
            : res.reason === "NO_PAYER"
            ? "Nessuno sponsor disponibile"
            : "Conflitto di salvataggio";
        throw Object.assign(new Error(msg), { code: res.reason, detail: res.detail });
      }

      toast({
        title: "Telemetria contabilizzata",
        description: `Pacchetti: ${qty} • costo: ${fmtCredits(simCost)} • tx: ${(res as any).tx?.id ?? "—"}`,
      });
    } catch (err: any) {
      toast({
        title: "Addebito non riuscito",
        description: err?.message ?? "Errore inatteso",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className={compact ? "w-full" : "w-full max-w-2xl"}>
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>Telemetria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Pacchetti: <span className="font-mono">{qty}</span>
            {" • "}
            Costo stimato: <span className="font-mono">{fmtCredits(simCost)}</span>
          </div>
          <div className="flex items-center gap-2">
            {!canPay && <span className="text-destructive">saldo insufficiente</span>}
            <Button size="sm" onClick={handleCharge} disabled={!canPay || pending || qty <= 0}>
              {pending ? "Addebito…" : "Addebita crediti"}
            </Button>
          </div>
        </div>

        {telemetry.map((t, i) => (
          <div key={i} className="border rounded-md p-2 text-xs font-mono bg-muted">
            <div className="text-muted-foreground">{normalizeTs(t.ts)}</div>
            <pre className="whitespace-pre-wrap">{JSON.stringify(t.value, null, 2)}</pre>
          </div>
        ))}
      </CardContent>
      <CardFooter />
    </Card>
  );
}
