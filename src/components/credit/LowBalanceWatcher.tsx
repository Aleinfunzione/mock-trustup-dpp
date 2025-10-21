// src/components/credit/LowBalanceWatcher.tsx
import * as React from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/authStore";
import * as CreditsApi from "@/services/api/credits";
import type { AccountOwnerType } from "@/types/credit";

type Watched = { id: string; label: string };

function dedupe<T extends { id: string }>(arr: T[]): T[] {
  const m = new Map<string, T>();
  for (const x of arr) if (x.id) m.set(x.id, x);
  return [...m.values()];
}

function asOwnerType(role?: string): AccountOwnerType {
  const r = String(role || "").toLowerCase();
  if (r.includes("operator")) return "operator";
  if (r.includes("machine") || r.includes("macchin")) return "machine";
  if (r.includes("admin")) return "admin";
  if (r.includes("company")) return "company";
  return "creator";
}

/** Osserva i conti correnti dell’utente e mostra un toast quando vanno in low-balance. */
export default function LowBalanceWatcher() {
  const { toast } = useToast();
  const { currentUser } = useAuthStore();

  // costruzione lista account da osservare
  const { watched, companyAcc } = React.useMemo(() => {
    if (!currentUser) return { watched: [] as Watched[], companyAcc: "" };
    const u: any = currentUser;
    const ownerType = asOwnerType(u.role);
    const ownerId = (u.id || u.did) as string | undefined;
    const companyDid = (u.companyId || u.companyDid) as string | undefined;

    const out: Watched[] = [];
    if (ownerId) {
      const label =
        ownerType === "admin"
          ? "Admin"
          : ownerType.charAt(0).toUpperCase() + ownerType.slice(1);
      out.push({ id: CreditsApi.accountId(ownerType, ownerId), label });
    }
    let compAcc = "";
    if (companyDid) {
      compAcc = CreditsApi.accountId("company", companyDid);
      out.push({ id: compAcc, label: "Azienda" });
    }
    return { watched: dedupe(out), companyAcc: compAcc };
  }, [currentUser]);

  // soglie note per account (ad oggi impostiamo solo quella azienda)
  const [thresholds, setThresholds] = React.useState<Record<string, number | undefined>>({});

  // stato precedente per evitare spam
  const prevLowRef = React.useRef<Record<string, boolean>>({});

  // carica/aggiorna la soglia azienda se l'API la espone
  const refreshThreshold = React.useCallback(async () => {
    if (!companyAcc) return;
    try {
      const api: any = CreditsApi as any;
      const cur = await api.getThreshold?.(companyAcc);
      if (typeof cur === "number" && !Number.isNaN(cur)) {
        setThresholds((m) => ({ ...m, [companyAcc]: cur }));
      }
    } catch {
      // nessuna soglia disponibile → si usa il flag low della balance
    }
  }, [companyAcc]);

  React.useEffect(() => {
    refreshThreshold();
  }, [refreshThreshold]);

  const check = React.useCallback(() => {
    if (!watched.length) return;
    const ids = watched.map((w) => w.id);
    const balances = CreditsApi.getBalances(ids); // [{id,balance,low?}]
    for (const b of balances) {
      const thr = thresholds[b.id];
      const isLow = typeof thr === "number" ? Number(b.balance) <= thr : !!(b as any).low;
      const wasLow = !!prevLowRef.current[b.id];

      if (!wasLow && isLow) {
        const label = watched.find((w) => w.id === b.id)?.label || "Account";
        toast({
          title: "Saldo crediti basso",
          description: `${label}: ${(b as any).balance} crediti. Ricarica o cambia sponsor.`,
          variant: "destructive",
        });
      }
      prevLowRef.current[b.id] = isLow;
    }
  }, [watched, thresholds, toast]);

  React.useEffect(() => {
    check();
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith("trustup:credits")) {
        // ricalcola soglie e saldi al cambio storage
        refreshThreshold();
        check();
      }
    };
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(check, 2000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, [check, refreshThreshold]);

  return null;
}
