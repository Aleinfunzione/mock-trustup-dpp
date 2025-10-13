// src/pages/company/CompanyCreditsPage.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/components/ui/use-toast";
import {
  accountId,
  getBalances,
  transferBetween,
  setThreshold,
  ensureMemberAccount,
} from "@/services/api/credits";
import type { AccountOwnerType } from "@/types/credit";
import CreditsBadge from "@/components/credit/CreditsBadge";
import CreditHistory from "@/components/credit/CreditHistory";

// ---- identity (fallback robusto)
import * as IdentityApi from "@/services/api/identity";

// ---- eventi per scoprire isole usate (seed editor)
import { listEvents } from "@/services/api/events";

// ---- bucket isole
import { getIslandBudget, setIslandBudget } from "@/stores/creditStore";

type Bal = { id: string; balance: number; low?: boolean };
type Actor = {
  did: string;
  role?: string; // creator | operator | machine | ...
  name?: string;
};

function roleToOwnerType(role?: string): AccountOwnerType {
  const r = (role || "").toLowerCase();
  if (r.includes("operator")) return "operator";
  if (r.includes("machine") || r.includes("macchin")) return "machine";
  if (r.includes("admin")) return "admin";
  return "creator";
}

async function loadCompanyActors(companyDid: string): Promise<Actor[]> {
  const api: any = IdentityApi as any;
  const fn =
    api.listCompanyMembers ||
    api.listMembersByCompany ||
    api.listByCompany ||
    api.listMembers ||
    api.list ||
    null;
  try {
    const res = typeof fn === "function" ? fn(companyDid) : [];
    const arr = Array.isArray(res) ? res : await Promise.resolve(res);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((a: any) => ({
        did: a.did || a.id || "",
        role: a.role || a.type || a.kind,
        name:
          a.displayName ||
          [a.firstName, a.lastName].filter(Boolean).join(" ").trim() ||
          a.fullName ||
          a.username ||
          a.email ||
          "Membro",
      }))
      .filter((x: Actor) => x.did);
  } catch {
    return [];
  }
}

type IslandRow = { id: string; budget: number };

export default function CompanyCreditsPage() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  const companyDid = currentUser?.companyDid || currentUser?.did || "";
  const companyAcc = companyDid ? accountId("company", companyDid) : "";

  const [amount, setAmount] = React.useState<number>(10);
  const [threshold, setThr] = React.useState<number>(10);

  const [members, setMembers] = React.useState<Actor[]>([]);
  const [memberDid, setMemberDid] = React.useState<string>("");
  const [memberType, setMemberType] = React.useState<AccountOwnerType>("creator");

  const memberAcc = memberDid ? accountId(memberType, memberDid) : "";

  const [balances, setBalances] = React.useState<Record<string, Bal>>({});
  const [loading, setLoading] = React.useState(false);

  // --- Bucket isole editor state
  const [islands, setIslands] = React.useState<IslandRow[]>([]);
  const [newIslandId, setNewIslandId] = React.useState("");

  // carica membri dell'azienda
  React.useEffect(() => {
    if (!companyDid) return;
    loadCompanyActors(companyDid).then((list) => {
      setMembers(list);
      if (list.length) {
        setMemberDid(list[0].did);
        setMemberType(roleToOwnerType(list[0].role));
      }
    });
  }, [companyDid]);

  // seed iniziale isole da eventi dell'azienda
  React.useEffect(() => {
    if (!companyDid) return;
    try {
      const evts = listEvents({ companyDid });
      const ids = Array.from(
        new Set(
          evts
            .map((e: any) => e.islandId || e.data?.islandId)
            .filter(Boolean) as string[]
        )
      );
      const rows = ids.map((id) => ({ id, budget: getIslandBudget(companyDid, id) }));
      setIslands(rows);
    } catch {
      // no-op
    }
  }, [companyDid]);

  const refreshIslandBudgets = React.useCallback(() => {
    setIslands((rows) =>
      rows.map(({ id }) => ({ id, budget: getIslandBudget(companyDid, id) }))
    );
  }, [companyDid]);

  // refresh bilanci
  const refresh = React.useCallback(() => {
    if (!companyAcc) return;
    const ids = [companyAcc, memberAcc].filter(Boolean);
    const list = getBalances(ids).reduce<Record<string, Bal>>((m, b) => {
      m[b.id] = b as Bal;
      return m;
    }, {});
    setBalances(list);
  }, [companyAcc, memberAcc]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  function onSelectMember(did: string) {
    setMemberDid(did);
    const m = members.find((x) => x.did === did);
    setMemberType(roleToOwnerType(m?.role));
  }

  async function handleTransferToMember() {
    if (!companyAcc || !memberAcc || amount <= 0) return;
    setLoading(true);
    try {
      await ensureMemberAccount(memberType, memberDid, 0);
      transferBetween(companyAcc, memberAcc, Math.floor(amount), {
        reason: "company_to_member",
      });
      toast({ title: "Trasferimento effettuato" });
      refresh();
    } catch (e: any) {
      toast({
        title: "Errore trasferimento",
        description: e?.message ?? "Impossibile trasferire",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleThresholdCompany() {
    if (!companyAcc) return;
    setLoading(true);
    try {
      setThreshold(companyAcc, Math.max(0, Math.floor(threshold)));
      toast({ title: "Soglia azienda aggiornata" });
      refresh();
    } catch (e: any) {
      toast({ title: "Errore soglia", description: e?.message ?? "Impossibile salvare", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function addIslandRow() {
    const id = newIslandId.trim();
    if (!id) return;
    if (islands.some((r) => r.id === id)) {
      toast({ title: "Isola già presente", variant: "destructive" });
      return;
    }
    setIslands((r) => [...r, { id, budget: getIslandBudget(companyDid, id) }]);
    setNewIslandId("");
  }

  function updateIslandBudgetLocal(id: string, v: number) {
    setIslands((rows) => rows.map((r) => (r.id === id ? { ...r, budget: v } : r)));
  }

  async function saveIslandBudget(id: string) {
    try {
      const row = islands.find((r) => r.id === id);
      if (!row) return;
      const b = Number.isFinite(row.budget) && row.budget >= 0 ? Math.floor(row.budget) : 0;
      setIslandBudget(companyDid, id, b);
      toast({ title: "Budget isola aggiornato", description: `Isola ${id} → ${b}` });
      refreshIslandBudgets();
    } catch (e: any) {
      toast({ title: "Errore budget isola", description: e?.message ?? "Impossibile salvare", variant: "destructive" });
    }
  }

  const companyBal = balances[companyAcc]?.balance ?? 0;
  const memberBal = memberAcc ? balances[memberAcc]?.balance ?? 0 : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crediti azienda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <CreditsBadge actor={{ ownerType: "company", ownerId: companyDid }} showActor={false} />
            {memberAcc && (
              <CreditsBadge actor={{ ownerType: memberType, ownerId: memberDid, companyId: companyDid }} showCompany={false} />
            )}
          </div>

          {/* Soglia low-balance (azienda) */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Soglia low-balance</Label>
              <Input
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThr(Number(e.target.value))}
              />
            </div>
            <div className="grid content-end">
              <Button variant="outline" onClick={handleThresholdCompany} disabled={!companyAcc || loading}>
                Imposta soglia
              </Button>
            </div>
            <div className="grid content-end text-xs text-muted-foreground">
              <div>Azienda: <span className="font-mono">{companyBal}</span></div>
              {memberAcc && <div>Membro: <span className="font-mono">{memberBal}</span></div>}
            </div>
          </div>

          {/* ---------------- Bucket isole ---------------- */}
          <div className="space-y-2">
            <Label>Allocazione crediti per isole</Label>
            <div className="flex gap-2">
              <Input
                placeholder="ID isola"
                value={newIslandId}
                onChange={(e) => setNewIslandId(e.target.value)}
                className="w-60"
              />
              <Button variant="outline" onClick={addIslandRow}>
                Aggiungi isola
              </Button>
            </div>

            {islands.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                Nessuna isola configurata. Aggiungi un ID per iniziare.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3">Isola</th>
                      <th className="py-2 pr-3">Budget attuale</th>
                      <th className="py-2 pr-3">Imposta nuovo budget</th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {islands.map((r) => (
                      <tr key={r.id}>
                        <td className="py-1 pr-3 font-mono">{r.id}</td>
                        <td className="py-1 pr-3 font-mono">{getIslandBudget(companyDid, r.id)}</td>
                        <td className="py-1 pr-3">
                          <Input
                            type="number"
                            min={0}
                            value={r.budget}
                            onChange={(e) => updateIslandBudgetLocal(r.id, Number(e.target.value))}
                            className="w-40"
                          />
                        </td>
                        <td className="py-1 pr-3">
                          <Button size="sm" variant="outline" onClick={() => saveIslandBudget(r.id)}>
                            Salva
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* ---------------- /Bucket isole ---------------- */}

          {/* Storico crediti con filtri + Export CSV */}
          <CreditHistory />
        </CardContent>
      </Card>
    </div>
  );
}
