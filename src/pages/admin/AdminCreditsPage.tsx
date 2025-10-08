// src/pages/admin/AdminCreditsPage.tsx
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
  initCredits,
  getBalances,
  topupAccount,
  transferBetween,
  listTransactions,
  setThreshold,
} from "@/services/api/credits";
import type { CreditTx } from "@/types/credit";
import CreditsBadge from "@/components/credit/CreditsBadge";

// sorgenti possibili per le aziende
import * as IdentityApi from "@/services/api/identity";

type Bal = { id: string; balance: number; low?: boolean };
type Company = { did: string; name?: string };

export default function AdminCreditsPage() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const adminDid = currentUser?.did || "";

  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [companyDid, setCompanyDid] = React.useState("");
  const [adminAcc, setAdminAcc] = React.useState<string>("");
  const [companyAcc, setCompanyAcc] = React.useState<string>("");
  const [balances, setBalances] = React.useState<Record<string, Bal>>({});
  const [amount, setAmount] = React.useState<number>(50);
  const [threshold, setThr] = React.useState<number>(10);
  const [txs, setTxs] = React.useState<CreditTx[]>([]);
  const [loading, setLoading] = React.useState(false);

  // admin account id
  React.useEffect(() => {
    if (!adminDid) return;
    setAdminAcc(accountId("admin", adminDid));
  }, [adminDid]);

  // carica aziende da API/ledger/storage
  React.useEffect(() => {
    loadCompanies().then(setCompanies).catch(() => setCompanies([]));
  }, []);

  // refresh pannello
  const refresh = React.useCallback(() => {
    if (!companyDid) {
      setCompanyAcc("");
      setBalances({});
      setTxs(listTransactions({ limit: 100 }).slice().reverse());
      return;
    }
    const cAcc = accountId("company", companyDid);
    setCompanyAcc(cAcc);
    const list = getBalances([adminAcc, cAcc]).reduce<Record<string, Bal>>((m, b) => {
      m[b.id] = b as Bal;
      return m;
    }, {});
    setBalances(list);
    setTxs(listTransactions({ accountId: cAcc, limit: 100 }).slice().reverse());
  }, [adminAcc, companyDid]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function ensureSeed() {
    if (!adminDid || !companyDid) return;
    initCredits({
      adminId: adminDid,
      companyIds: [companyDid],
      members: [],
      defaults: { balance: 0, threshold: 0 },
    });
  }

  async function handleTopup() {
    if (!companyAcc || amount <= 0) return;
    setLoading(true);
    try {
      await ensureSeed();
      topupAccount(companyAcc, Math.floor(amount), { by: adminDid });
      toast({ title: "Top-up eseguito" });
      refresh();
    } catch (e: any) {
      toast({ title: "Errore top-up", description: e?.message ?? "Impossibile ricaricare", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer() {
    if (!adminAcc || !companyAcc || amount <= 0) return;
    setLoading(true);
    try {
      await ensureSeed();
      transferBetween(adminAcc, companyAcc, Math.floor(amount), { by: adminDid });
      toast({ title: "Trasferimento riuscito" });
      refresh();
    } catch (e: any) {
      toast({ title: "Errore trasferimento", description: e?.message ?? "Impossibile trasferire", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleThreshold() {
    if (!companyAcc) return;
    setLoading(true);
    try {
      setThreshold(companyAcc, Math.max(0, Math.floor(threshold)));
      toast({ title: "Soglia aggiornata" });
      refresh();
    } catch (e: any) {
      toast({ title: "Errore soglia", description: e?.message ?? "Impossibile salvare", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedDemo() {
    if (!adminDid || !companyDid) {
      toast({ title: "Seleziona un’azienda", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // crea account se mancanti con saldi iniziali
      initCredits({
        adminId: adminDid,
        companyIds: [companyDid],
        members: [],
        defaults: { balance: 200, threshold: 10 }, // saldo iniziale fittizio
      });
      // ricarica anche l'admin per i test
      const aId = accountId("admin", adminDid);
      const cId = accountId("company", companyDid);
      topupAccount(aId, 800, { reason: "seed-demo" });
      topupAccount(cId, 300, { reason: "seed-demo" });
      toast({ title: "Seed demo completato" });
      refresh();
    } catch (e: any) {
      toast({ title: "Errore seed demo", description: e?.message ?? "Impossibile inizializzare", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const adminBal = balances[adminAcc]?.balance ?? 0;
  const companyBal = balances[companyAcc]?.balance ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestione crediti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs text-muted-foreground">
            Top-up: accredita direttamente all’azienda. Transfer: sposta da Admin → Azienda. Soglia definisce il limite low-balance.
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            <CreditsBadge actor={{ ownerType: "admin", ownerId: adminDid }} showCompany={false} />
            {companyAcc && (
              <CreditsBadge actor={{ ownerType: "company", ownerId: companyDid }} showActor={false} />
            )}
          </div>

          {/* Scelta azienda */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-2">
              <Label>Azienda</Label>
              <div className="flex gap-2">
                <Select
                  value={companyDid || ""}
                  onValueChange={(v) => setCompanyDid(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={companies.length ? "Seleziona azienda" : "Nessuna azienda trovata"} />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    {companies.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Nessuna azienda disponibile</div>
                    ) : (
                      companies.map((c) => (
                        <SelectItem key={c.did} value={c.did}>
                          {(c.name || "Azienda") + " — " + c.did}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {/* input libero fallback */}
                <Input
                  className="w-[40%]"
                  placeholder="oppure DID manuale"
                  value={companyDid}
                  onChange={(e) => setCompanyDid(e.target.value.trim())}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-mono">{companyAcc || "—"}</div>
            </div>
            <div className="grid content-end gap-2">
              <Button variant="secondary" onClick={refresh}>Carica</Button>
              <Button variant="outline" onClick={handleSeedDemo} disabled={!companyDid || loading}>Seed crediti demo</Button>
            </div>
          </div>

          {/* Operazioni */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Importo</Label>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div className="grid content-end">
              <Button onClick={handleTopup} disabled={!companyAcc || loading}>Top-up azienda</Button>
            </div>
            <div className="grid content-end">
              <Button variant="outline" onClick={handleTransfer} disabled={!companyAcc || loading}>
                Trasferisci da Admin → Azienda
              </Button>
            </div>
          </div>

          {/* Soglia low-balance */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Soglia low-balance azienda</Label>
              <Input
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThr(Number(e.target.value))}
              />
            </div>
            <div className="grid content-end">
              <Button variant="outline" onClick={handleThreshold} disabled={!companyAcc || loading}>
                Imposta soglia
              </Button>
            </div>
            <div className="grid content-end text-xs text-muted-foreground">
              <div>Admin: <span className="font-mono">{adminBal}</span></div>
              <div>Azienda: <span className="font-mono">{companyBal}</span></div>
            </div>
          </div>

          {/* Storico */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Storico transazioni {companyAcc ? "(azienda)" : "(tutte)"} </div>
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
                      <td className="p-2">
                        {(t as any).ref ? JSON.stringify((t as any).ref) : "—"}
                      </td>
                      <td className="p-2">
                        {(t as any).meta ? JSON.stringify((t as any).meta) : "—"}
                      </td>
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

/* -------- helpers -------- */
async function loadCompanies(): Promise<Company[]> {
  const idFromAny = await discoverCompaniesFromIdentity();
  if (idFromAny.length) return dedupeCompanies(idFromAny);
  const fromStorage = discoverCompaniesFromStorage();
  return dedupeCompanies(fromStorage);
}

async function discoverCompaniesFromIdentity(): Promise<Company[]> {
  const api: any = IdentityApi as any;

  const nameCandidates = [
    "listCompanies","getCompanies","listOrganizations","getOrganizations",
    "listAllCompanies","listOrgs","companies","orgs","list"
  ];

  for (const name of nameCandidates) {
    const fn = api?.[name];
    if (typeof fn === "function") {
      try {
        const res = await Promise.resolve(fn());
        const arr = normalizeCompanyArray(res);
        if (arr.length) return arr;
      } catch {}
    }
  }
  for (const name of nameCandidates) {
    const val = api?.[name];
    if (Array.isArray(val)) {
      const arr = normalizeCompanyArray(val);
      if (arr.length) return arr;
    }
  }
  try {
    const allExports = Object.values(api);
    for (const v of allExports) {
      if (Array.isArray(v)) {
        const arr = normalizeCompanyArray(v);
        if (arr.length) return arr;
      }
      if (typeof v === "function") {
        try {
          const res = await Promise.resolve((v as any)());
          const arr = normalizeCompanyArray(res);
          if (arr.length) return arr;
        } catch {}
      }
    }
  } catch {}
  return [];
}

function normalizeCompanyArray(x: any): Company[] {
  if (!x) return [];
  const arr = Array.isArray(x) ? x : Array.isArray(x?.companies) ? x.companies : [];
  return arr
    .map((c: any) => ({
      did: c?.did || c?.id || "",
      name: c?.name || c?.displayName || c?.title,
    }))
    .filter((c: Company) => typeof c.did === "string" && c.did.startsWith("did:"));
}

function dedupeCompanies(list: Company[]): Company[] {
  const m = new Map<string, Company>();
  for (const c of list) if (c.did && !m.has(c.did)) m.set(c.did, c);
  return Array.from(m.values());
}

function discoverCompaniesFromStorage(): Company[] {
  const out: Company[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const v = JSON.parse(raw);
        scanObjectForCompanyDid(v, out);
      } catch {}
    }
  } catch {}
  return out;
}

function scanObjectForCompanyDid(v: any, out: Company[]) {
  if (!v) return;
  const push = (did?: string, name?: string) => {
    if (typeof did === "string" && did.startsWith("did:")) out.push({ did, name });
  };
  if (Array.isArray(v)) {
    for (const it of v) scanObjectForCompanyDid(it, out);
    return;
  }
  if (typeof v === "object") {
    push(v.companyDid || v.orgDid || v.organizationDid, v.name || v.displayName || v.title);
    for (const val of Object.values(v)) scanObjectForCompanyDid(val, out);
  }
}
