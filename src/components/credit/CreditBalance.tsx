// src/components/credit/CreditBalance.tsx
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { getAccountId } from "@/stores/creditStore"; // helper id
import { getBalance, isLowBalance } from "@/stores/creditStore";

type Props = {
  /** opzionale: forza l’account da mostrare */
  accountId?: string;
  /** polling ms per aggiornare il saldo */
  refreshMs?: number;
};

function resolveAccountId(role?: string, did?: string, companyDid?: string) {
  const r = (role || "").toLowerCase();
  if (r === "admin") return getAccountId("admin", did!);
  if (r === "company") return getAccountId("company", companyDid || did!);
  if (r === "creator") return getAccountId("creator", did!);
  if (r === "operator") return getAccountId("operator", did!);
  if (r === "machine") return getAccountId("machine", did!);
  // fallback: company se presente
  return companyDid ? getAccountId("company", companyDid) : did ? getAccountId("creator", did) : "";
}

function fmt(n: number) {
  return Number.isFinite(n) ? Number(n.toFixed(3)).toString() : String(n);
}

export default function CreditBalance({ accountId, refreshMs = 1500 }: Props) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  const accId =
    accountId ||
    resolveAccountId(currentUser?.role, (currentUser as any)?.did || (currentUser as any)?.id, currentUser?.companyDid);

  const [balance, setBalance] = React.useState<number>(getBalance(accId));
  const [low, setLow] = React.useState<boolean>(isLowBalance(accId));
  const prevLowRef = React.useRef<boolean>(low);

  const refresh = React.useCallback(() => {
    if (!accId) return;
    const b = getBalance(accId);
    const l = isLowBalance(accId);
    setBalance(b);
    setLow(l);
    if (l && prevLowRef.current !== l) {
      toast({
        title: "Crediti in esaurimento",
        description: `Account ${accId}: saldo ${fmt(b)}`,
        variant: "destructive",
      });
    }
    prevLowRef.current = l;
  }, [accId, toast]);

  // polling leggero + evento storage
  React.useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, refreshMs);
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes("trustup:credits")) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh, refreshMs]);

  const cls =
    low
      ? "bg-red-600/15 text-red-700 dark:text-red-300 border border-red-600/30"
      : "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-600/30";

  return (
    <div className="flex items-center gap-2">
      <Badge className={cls} title={accId}>
        {fmt(balance)} cr
      </Badge>
      <Button variant="ghost" size="sm" onClick={refresh} aria-label="Aggiorna saldo">
        ↻
      </Button>
    </div>
  );
}
