// src/components/events/MachineAutocomplete.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { simulate as simulateCredits, spend as spendCredits } from "@/services/api/credits";
import type { AccountOwnerType, ConsumeActor, CreditAction, ConsumeResult } from "@/types/credit";

type MachineAutocompleteProps = {
  /** Evento da completare automaticamente */
  eventId: string;
  /** Prodotto associato, usato per ref e bucket isola */
  productId?: string;
  /** Isola associata per bucket-charging */
  islandId?: string;
  /** Numero di completamenti automatici da registrare in batch */
  count?: number;
  /** Facoltativo: elementi grezzi che determinano il qty */
  items?: unknown[];
  /** Callback al termine (successo) */
  onDone?: (txId?: string) => void;
  /** Compatta la UI */
  compact?: boolean;
};

function fmt(n: number) {
  if (!Number.isFinite(n)) return String(n);
  const s = n.toFixed(3);
  return s.replace(/\.?0+$/, "");
}

export default function MachineAutocomplete({
  eventId,
  productId,
  islandId,
  count,
  items,
  onDone,
  compact,
}: MachineAutocompleteProps) {
  const { toast } = useToast();
  const { currentUser } = useAuthStore();

  const qty = React.useMemo(() => {
    if (Array.isArray(items)) return items.length || 1;
    if (Number.isFinite(count) && (count as number) > 0) return Math.floor(count as number);
    return 1;
  }, [items, count]);

  const actor: ConsumeActor | null = React.useMemo(() => {
    if (!currentUser?.did) return null;
    const u: any = currentUser;
    return {
      ownerType: (currentUser?.role ?? "company") as AccountOwnerType,
      ownerId: (u?.id ?? u?.did) as string,
      companyId: (u?.companyId ?? u?.companyDid) as string | undefined,
    };
  }, [currentUser?.did, currentUser?.role, (currentUser as any)?.companyId, (currentUser as any)?.companyDid]);

  const [cost, setCost] = React.useState(0);
  const [canPay, setCanPay] = React.useState(true);
  const [pending, setPending] = React.useState(false);

  // Simulazione costo e sponsor
  React.useEffect(() => {
    if (!actor) {
      setCost(0);
      setCanPay(true);
      return;
    }
    try {
      const sim = simulateCredits("MACHINE_AUTOCOMPLETE" as CreditAction, actor, qty);
      setCost(sim.cost || 0);
      setCanPay(!!sim.payer);
    } catch {
      setCost(0);
      setCanPay(false);
    }
  }, [actor?.ownerId, actor?.companyId, qty]);

  async function handleSpend() {
    if (!actor) {
      toast({ title: "Utente non autenticato", description: "Effettua il login.", variant: "destructive" });
      return;
    }
    setPending(true);
    try {
      const dedup = `MACHINE_AUTOCOMPLETE:${eventId}:${qty}`;
      const res = spendCredits(
        "MACHINE_AUTOCOMPLETE" as CreditAction,
        actor,
        {
          kind: "machine_autocomplete",
          productId,
          eventId,
          islandId,
          actorDid: actor.ownerId,
          batch: { count: qty },
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

      const txId = (res as any).tx?.id as string | undefined;
      toast({
        title: "Completamento automatico registrato",
        description: `Batch: ${qty} • costo: ${fmt(cost)} • tx: ${txId ?? "—"}`,
      });
      onDone?.(txId);
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
      <CardHeader>
        <CardTitle>Completamento automatico macchina</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
        <div>
          Event: <span className="font-mono">{eventId}</span>
          {islandId ? <> • Isola: <span className="font-mono">{islandId}</span></> : null}
          {" • "}
          Batch: <span className="font-mono">{qty}</span>
          {" • "}
          Costo stimato: <span className="font-mono">{fmt(cost)}</span>
          {!canPay && <span className="text-destructive ml-2">saldo insufficiente</span>}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSpend} disabled={!canPay || pending}>
          {pending ? "Addebito…" : "Addebita crediti"}
        </Button>
      </CardFooter>
    </Card>
  );
}
