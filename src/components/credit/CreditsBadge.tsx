// src/components/credit/CreditsBadge.tsx
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"; // se assente, sostituisci cn con semplice join
import { accountId, getBalances } from "@/services/api/credits";
import type { AccountOwnerType } from "@/types/credit";

type ActorRef = {
  ownerType: AccountOwnerType;
  ownerId: string;
  companyId?: string;
};

type CreditsBadgeProps = {
  actor?: ActorRef;
  showCompany?: boolean; // default true
  showActor?: boolean;   // default true
  className?: string;
  refreshMs?: number;    // opzionale: auto-refresh
  compact?: boolean;     // se true mostra solo numeri
};

type BalanceItem = { id: string; label: string; balance: number; low: boolean };

export default function CreditsBadge({
  actor,
  showCompany = true,
  showActor = true,
  className,
  refreshMs,
  compact,
}: CreditsBadgeProps) {
  const [items, setItems] = React.useState<BalanceItem[]>([]);

  const refresh = React.useCallback(() => {
    const ids: { id: string; label: string }[] = [];
    if (actor && showCompany && actor.companyId) {
      ids.push({ id: accountId("company", actor.companyId), label: "Azienda" });
    }
    if (actor && showActor) {
      ids.push({ id: accountId(actor.ownerType, actor.ownerId), label: labelForActor(actor.ownerType) });
    }
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    const balances = getBalances(ids.map((x) => x.id));
    const next: BalanceItem[] = balances.map((b, i) => ({
      id: b.id,
      label: ids[i].label,
      balance: b.balance ?? 0,
      low: !!b.low,
    }));
    setItems(next);
  }, [actor, showCompany, showActor]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (!refreshMs) return;
    const t = setInterval(refresh, Math.max(1000, refreshMs));
    return () => clearInterval(t);
  }, [refreshMs, refresh]);

  if (!items.length) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {items.map((it) => (
        <Badge
          key={it.id}
          className={cn(
            "border",
            it.low ? "bg-amber-500/15 text-amber-700 border-amber-600/30" : "bg-emerald-600/15 text-emerald-700 border-emerald-600/30"
          )}
          title={`${it.label}: ${it.balance} crediti${it.low ? " • soglia bassa" : ""}`}
        >
          {compact ? (
            <span>{it.balance}</span>
          ) : (
            <span>
              {prefixFor(it.label)} {it.balance}
              {it.low ? " ⚠︎" : ""}
            </span>
          )}
        </Badge>
      ))}
    </div>
  );
}

function labelForActor(t: AccountOwnerType): string {
  if (t === "creator") return "Creator";
  if (t === "operator") return "Operatore";
  if (t === "machine") return "Macchina";
  if (t === "company") return "Azienda";
  if (t === "admin") return "Admin";
  return t;
}

function prefixFor(label: string): string {
  if (label === "Azienda") return "🏢";
  if (label === "Creator") return "🧩";
  if (label === "Operatore") return "👷";
  if (label === "Macchina") return "🤖";
  if (label === "Admin") return "🛡️";
  return "💳";
}
