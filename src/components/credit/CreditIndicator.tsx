// src/components/credits/CreditIndicator.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { accountId, getAccountBalance } from "@/services/api/credits";
import { WalletMinimal, AlertTriangle } from "lucide-react";

type Bal = { id: string; balance: number; low?: boolean; threshold?: number };

export default function CreditIndicator() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  const role = currentUser?.role;
  const companyDid = currentUser?.companyDid;
  const adminDid = currentUser?.did;

  const accId =
    companyDid ? accountId("company", companyDid) : role === "admin" && adminDid ? accountId("admin", adminDid) : "";

  const creditsHref =
    role === "company" ? "/company/credits" : role === "admin" ? "/admin/credits" : undefined;

  const [bal, setBal] = React.useState<Bal | null>(null);
  const [notifiedLow, setNotifiedLow] = React.useState(false);

  React.useEffect(() => {
    if (!accId) return;
    let mounted = true;
    let t: any;

    const read = () => {
      try {
        const raw: any = getAccountBalance(accId);
        let b: Bal;
        if (raw && typeof raw === "object") {
          b = {
            id: raw.id ?? accId,
            balance: Number(raw.balance ?? 0),
            low: !!raw.low,
            threshold: typeof raw.threshold === "number" ? raw.threshold : undefined,
          };
        } else if (typeof raw === "number") {
          b = { id: accId, balance: raw };
        } else {
          b = { id: accId, balance: 0 };
        }
        if (mounted) setBal(b);
      } catch {
        if (mounted) setBal({ id: accId, balance: 0 });
      }
    };

    read();
    t = setInterval(read, 5000);
    const onVis = () => document.visibilityState === "visible" && read();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      mounted = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [accId]);

  React.useEffect(() => {
    if (!bal) return;
    const isLow = !!bal.low || (typeof bal.threshold === "number" && bal.balance <= bal.threshold);
    if (isLow && !notifiedLow) {
      toast({
        title: "Crediti bassi",
        description:
          typeof bal.threshold === "number"
            ? `Saldo ${bal.balance} ≤ soglia ${bal.threshold}.`
            : `Saldo basso: ${bal.balance}.`,
        variant: "destructive",
      });
      setNotifiedLow(true);
    }
    if (!isLow && notifiedLow) setNotifiedLow(false);
  }, [bal, notifiedLow, toast]);

  if (!accId) return null;

  const isLow = !!bal?.low || (typeof bal?.threshold === "number" && (bal?.balance ?? 0) <= (bal?.threshold ?? 0));

  return (
    <div className="flex items-center gap-2">
      {creditsHref ? (
        <Button asChild variant="outline" size="sm" className="h-8">
          <Link to={creditsHref} title="Gestione crediti">
            <WalletMinimal className="h-4 w-4 mr-2" />
            <span className="font-mono">{bal?.balance ?? 0} cr</span>
          </Link>
        </Button>
      ) : (
        <div className="px-2 py-1 border rounded text-sm">
          <span className="font-mono">{bal?.balance ?? 0} cr</span>
        </div>
      )}
      {isLow && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Low
        </Badge>
      )}
    </div>
  );
}
