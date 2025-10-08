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
  listTransactions,
  transferBetween,
  setThreshold,
  ensureMemberAccount,          // NEW
} from "@/services/api/credits";
import type { AccountOwnerType, CreditTx } from "@/types/credit";
import CreditsBadge from "@/components/credit/CreditsBadge";

// ---- identity (fallback robusto)
import * as IdentityApi from "@/services/api/identity";

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

export default function CompanyCreditsPage() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  const companyDid = currentUser?.companyDid || currentUser?.did || "";
  const companyAcc = companyDid ? accountId("company", companyDid) : "";

  const [amount, setAmount] = React.useState<number>(10);
  const [threshold, setThr] = React.useState<number>(10);

  const [members, setMembers] = React.useState<Actor[]>([]);
  const [memberDid, setMemberDid] = React.useState<string>("");
  const [memberType, setMemberType] = React.useState<AccountOwnerType>("creator"); // derivato da ruolo

  const memberAcc = memberDid ? accountId(memberType, memberDid) : "";

  const [balances, setBalances] = React.useState<Record<string, Bal>>({});
  const [txs, setTxs] = React.useState<CreditTx[]>([]);
  const [loading, setLoading] = React.useState(false);

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

  // refresh bilanci + storico (SOLO account azienda)
  const refresh = React.useCallback(() => {
    if (!companyAcc) return;
    const ids = [companyAcc, memberAcc].filter(Boolean);
    const list = getBalances(ids).reduce<Record<string, Bal>>((m, b) => {
      m[b.id] = b as Bal;
      return m;
    }, {});
    setBalances(list);
    setTxs(listTransactions({ accountId: companyAcc, limit: 100 }).slice().reverse());
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
      // Assicura l'esistenza dell'account del membro (creator/operator/machine/admin)
      await ensureMemberAccount(memberType, memberDid, 0);

      // Esegue trasferimento
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

  const companyBal = balances[companyAcc]?.balance ?? 0;
  const memberBal = memberAcc ? balances[memberAcc]?.balance ?? 0 : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crediti azienda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Distribuzione ai membri */}
          <div className="space-y-2">
            <Label>Trasferisci a membro (Creator / Operatore / Macchina)</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Select value={memberDid} onValueChange={onSelectMember}>
                  <SelectTrigger>
                    <SelectValue placeholder={members.length ? "Seleziona membro" : "Nessun membro disponibile"} />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    {members.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Nessun membro</div>
                    ) : (
                      members.map((m) => (
                        <SelectItem key={m.did} value={m.did}>
                          {(m.name || "Membro") + " — " + m.did + (m.role ? ` • ${m.role}` : "")}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground mt-1 font-mono">{memberAcc || "—"}</div>
              </div>
              <div>
                <Label>Importo</Label>
                <Input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </div>
              <div className="sm:col-span-3 grid content-end">
                <Button onClick={handleTransferToMember} disabled={!memberAcc || amount <= 0 || loading}>
                  Trasferisci crediti al membro
                </Button>
              </div>
            </div>
          </div>

          {/* Storico SOLO azienda */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Storico azienda</div>
            <div className="border rounded">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">From</th>
                    <th className="p-2 text-left">To</th>
                    <th className="p-2 text-right">Δ</th>
                    <th className="p-2 text-left">Action</th>
                    <th className="p-2 text-left">Ref</th>
                    <th className="p-2 text-left">Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id} className="border-t">
                      <td className="p-2 font-mono">{t.id.slice(0, 8)}</td>
                      <td className="p-2">{t.type}</td>
                      <td className="p-2">{new Date(t.ts).toLocaleString()}</td>
                      <td className="p-2 font-mono">{t.fromAccountId || "—"}</td>
                      <td className="p-2 font-mono">{t.toAccountId || "—"}</td>
                      <td className="p-2 text-right">{t.amount}</td>
                      <td className="p-2">{(t as any).action || "—"}</td>
                      <td className="p-2">{(t as any).ref ? JSON.stringify((t as any).ref) : "—"}</td>
                      <td className="p-2">{(t as any).meta ? JSON.stringify((t as any).meta) : "—"}</td>
                    </tr>
                  ))}
                  {txs.length === 0 && (
                    <tr><td className="p-2 text-muted-foreground" colSpan={9}>Nessuna transazione</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
