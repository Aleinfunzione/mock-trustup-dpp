// src/components/credit/CreditsBadge.tsx
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertTriangle } from "lucide-react";
import { getAccountId, getBalancesByIds } from "@/stores/creditStore";
import type { AccountOwnerType } from "@/types/credit";
import clsx from "clsx";

type ActorRef = {
  ownerType: AccountOwnerType;
  ownerId: string;
  companyId: string;
};

type CreditsBadgeProps = {
  actor?: ActorRef;
  showCompany?: boolean;     // default true
  showActor2?: boolean;      // legacy, ignorato
  className?: string;
  refreshMs?: number;        // default 1500
  compact?: boolean;         // solo numeri se true
};

export default function CreditsBadge(props: CreditsBadgeProps) {
  const { actor, showCompany = true, className, refreshMs = 1500, compact = false } = props;

  const [balances, setBalances] = React.useState<{ id: string; balance: number; low: boolean }[]>([]);

  const ids = React.useMemo(() => {
    if (!actor) return [];
    const list: string[] = [];
    list.push(getAccountId(actor.ownerType, actor.ownerId));          // actor
    if (showCompany && actor.companyId) list.push(getAccountId("company", actor.companyId)); // company
    return list;
  }, [actor, showCompany]);

  const refresh = React.useCallback(() => {
    if (!ids.length) return;
    setBalances(getBalancesByIds(ids));
  }, [ids]);

  React.useEffect(() => {
    refresh();
    if (!ids.length) return;
    const t = window.setInterval(refresh, refreshMs);
    return () => window.clearInterval(t);
  }, [refresh, ids, refreshMs]);

  if (!actor || ids.length === 0) return null;

  const byId = Object.fromEntries(balances.map((b) => [b.id, b]));
  const accActor = byId[getAccountId(actor.ownerType, actor.ownerId)];
  const accCompany = showCompany && actor.companyId ? byId[getAccountId("company", actor.companyId)] : undefined;

  const renderPill = (label: string, bal?: { balance: number; low: boolean }) => {
    if (!bal) return null;
    const content = compact ? bal.balance : `${label}: ${bal.balance} cr`;
    return (
      <Badge
        key={label}
        className={clsx(
          "gap-1 font-mono",
          bal.low ? "bg-amber-600/20 text-amber-300" : "bg-slate-700/40 text-slate-200"
        )}
      >
        {bal.low ? <AlertTriangle className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
        {content}
      </Badge>
    );
  };

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      {renderPill("actor", accActor)}
      {showCompany && renderPill("company", accCompany)}
    </div>
  );
}
