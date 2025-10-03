// src/components/credit/CreditsBadge.tsx
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertTriangle } from "lucide-react";
import { accountId, getBalances } from "@/services/api/credits";
import type { AccountOwnerType } from "@/types/credit";

// cn fallback
let cn: (...c: Array<string | false | undefined>) => string;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const utils = require("@/lib/utils");
  cn = utils.cn ?? ((...c: any[]) => c.filter(Boolean).join(" "));
} catch {
  cn = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(" ");
}

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
  refreshMs?: number;    // auto-refresh
  compact?: boolean;     // solo numeri se true
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

  const refresh = React.useCallback(async () => {
    const ids: { id: string; label: string }[] = [];
    if (actor && showCompany && actor.companyId) {
      ids.push({ id: accountId("company", actor.companyId), label: "Azienda" });
    }
    if (actor && showActor) {
      ids.push({ id: accountId(actor.ownerType, actor.ownerId), label: labelForActor(actor.ownerType) });
    }
    if (ids.length === 0) return setItems([]);

    const balances = await Promise.resolve(getBalances(ids.map((x) => x.id)));
    const next: BalanceItem[] = balances.map((b: any, i: number) => ({
      id: b.id,
      label: ids[i].label,
      balance: Number(b?.balance ?? 0),
      low: Boolean(b?.low),
    }));
    setItems(next);
  }, [actor, showCompany, showActor]);

  React.useEffect(() => { void refresh(); }, [refresh]);
  React.useEffect(() => {
    if (!refreshMs) return;
    const t = setInterval(() => void refresh(), Math.max(1000, refreshMs));
    return () => clearInterval(t);
  }, [refreshMs, refresh]);

  if (!items.length) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {items.map((it) => (
        <Badge
          key={it.id}
          variant="secondary"
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium gap-1 inline-flex items-center",
            it.low && "ring-1 ring-amber-500/40"
          )}
          title={`${it.label}: ${it.balance} crediti${it.low ? " • soglia bassa" : ""}`}
        >
          <CreditCard className="h-3 w-3" aria-hidden />
          {compact ? (
            <span className="tabular-nums">{it.balance}</span>
          ) : (
            <>
              <span className="hidden sm:inline">{it.label}</span>
              <span className="tabular-nums">{it.balance}</span>
            </>
          )}
          {it.low && <AlertTriangle className="h-3 w-3" aria-hidden />}
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
