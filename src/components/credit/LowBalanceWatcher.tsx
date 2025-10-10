// src/components/credit/LowBalanceWatcher.tsx
import * as React from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { getAccountId, getBalancesByIds } from "@/stores/creditStore";

type Watched = { id: string; label: string };

function dedupe<T extends { id: string }>(arr: T[]): T[] {
  const m = new Map<string, T>();
  for (const x of arr) if (x.id) m.set(x.id, x);
  return [...m.values()];
}

/** Osserva i conti correnti dell’utente e mostra un toast quando vanno in low-balance. */
export default function LowBalanceWatcher() {
  const { toast } = useToast();
  const { currentUser } = useAuthStore();

  // costruzione lista account da osservare
  const watched = React.useMemo<Watched[]>(() => {
    if (!currentUser) return [];
    const u: any = currentUser;
    const role = (u.role || "company") as string;
    const ownerId = (u.id || u.did) as string | undefined;
    const companyDid = (u.companyId || u.companyDid) as string | undefined;

    const out: Watched[] = [];
    if (ownerId) {
      out.push({
        id: getAccountId(role as any, ownerId),
        label: role === "admin" ? "Admin" : role.charAt(0).toUpperCase() + role.slice(1),
      });
    }
    if (companyDid) {
      out.push({ id: getAccountId("company" as any, companyDid), label: "Azienda" });
    }
    return dedupe(out);
  }, [currentUser]);

  // stato precedente per evitare spam
  const prevLowRef = React.useRef<Record<string, boolean>>({});

  const check = React.useCallback(() => {
    if (!watched.length) return;
    const ids = watched.map((w) => w.id);
    const balances = getBalancesByIds(ids); // [{id,balance,low}]
    for (const b of balances) {
      const wasLow = !!prevLowRef.current[b.id];
      const isLow = !!b.low;
      if (!wasLow && isLow) {
        const label = watched.find((w) => w.id === b.id)?.label || "Account";
        toast({
          title: "Saldo crediti basso",
          description: `${label}: ${b.balance} crediti. Ricarica o cambia sponsor.`,
          variant: "destructive",
        });
      }
      prevLowRef.current[b.id] = isLow;
    }
  }, [watched, toast]);

  React.useEffect(() => {
    check();
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.includes("trustup:credits")) check();
    };
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(check, 2000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, [check]);

  return null;
}
