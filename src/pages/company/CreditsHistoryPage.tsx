// src/pages/company/CreditsHistoryPage.tsx
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CreditHistory from "@/components/credit/CreditHistory";
import { useAuthStore } from "@/stores/authStore";
import * as CreditsApi from "@/services/api/credits";

type Tx = {
  id?: string;
  accountId?: string;
  amount?: number;
  action?: string;
  createdAt?: string;
  timestamp?: string;
  payerType?: string;
  payerAccountId?: string;
  txRef?: string;
  ref?: string;
  meta?: any;
};

function parseDate(s?: string) {
  if (!s) return undefined;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : undefined;
}

export default function CreditsHistoryPage() {
  const { currentUser } = useAuthStore();
  const companyDid = (currentUser?.companyDid || currentUser?.did || "") as string;
  const companyAcc = companyDid ? CreditsApi.accountId("company", companyDid) : "";

  const [params, setParams] = useSearchParams();
  const [account, setAccount] = React.useState<string>(params.get("account") || "");
  const [islandId, setIslandId] = React.useState<string>(params.get("islandId") || "");
  const [txRef, setTxRef] = React.useState<string>(params.get("txRef") || "");
  const [dateFrom, setDateFrom] = React.useState<string>(params.get("from") || "");
  const [dateTo, setDateTo] = React.useState<string>(params.get("to") || "");
  const [limit, setLimit] = React.useState<number>(Number(params.get("limit") || 200));

  React.useEffect(() => {
    // prefill account se deep-link vuoto
    if (!account && companyAcc) setAccount(params.get("account") || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyAcc]);

  function applyFilters() {
    const next = new URLSearchParams();
    if (account) next.set("account", account);
    if (islandId) next.set("islandId", islandId);
    if (txRef) next.set("txRef", txRef);
    if (dateFrom) next.set("from", dateFrom);
    if (dateTo) next.set("to", dateTo);
    if (limit) next.set("limit", String(limit));
    setParams(next, { replace: true });
  }

  function resetFilters() {
    setAccount("");
    setIslandId("");
    setTxRef("");
    setDateFrom("");
    setDateTo("");
    setLimit(200);
    setParams(new URLSearchParams(), { replace: true });
  }

  async function getCompanyAccountIds(): Promise<string[]> {
    if (!companyAcc) return [];
    try {
      const api: any = CreditsApi as any;
      const fn =
        api.listCompanyAccounts ||
        api.accountsByCompany ||
        api.listAccountsByCompany ||
        null;
      const res = typeof fn === "function" ? await fn(companyDid) : [];
      const arr = Array.isArray(res) ? res : await Promise.resolve(res);
      const ids = (arr || []).map((a: any) => a.id).filter(Boolean);
      return ids.length ? ids : [companyAcc];
    } catch {
      return [companyAcc];
    }
  }

  async function fetchAllTx(): Promise<Tx[]> {
    const accounts: string[] = account
      ? [account]
      : await getCompanyAccountIds();
    const all: Tx[] = [];
    for (const acc of accounts) {
      try {
        const arr = (await CreditsApi.listTransactions({ accountId: acc, limit })) as any[];
        for (const t of arr || []) all.push({ ...t });
      } catch {
        // ignora account non leggibili
      }
    }
    return all;
  }

  function passDateFilter(t: Tx) {
    const ts = parseDate(t.createdAt || t.timestamp);
    const from = parseDate(dateFrom);
    const to = parseDate(dateTo ? `${dateTo}T23:59:59` : "");
    if (from && ts && ts < from) return false;
    if (to && ts && ts > to) return false;
    return true;
  }

  function passIslandFilter(t: Tx) {
    if (!islandId) return true;
    const m = t.meta || {};
    const isl = m.islandId || m.island || m.scopeId;
    return String(isl || "") === islandId;
  }

  function passTxRefFilter(t: Tx) {
    if (!txRef) return true;
    const ref = t.txRef || t.ref;
    return String(ref || "").includes(txRef);
  }

  function toCSV(rows: Tx[]) {
    const header = [
      "createdAt",
      "accountId",
      "action",
      "amount",
      "payerType",
      "payerAccountId",
      "txRef",
      "islandId",
      "meta",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      const created = r.createdAt || r.timestamp || "";
      const isl = r.meta?.islandId || r.meta?.island || "";
      const cells = [
        created,
        r.accountId || "",
        r.action || "",
        String(r.amount ?? ""),
        r.payerType || "",
        r.payerAccountId || "",
        r.txRef || r.ref || "",
        String(isl || ""),
        JSON.stringify(r.meta ?? {}),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }
    return lines.join("\n");
  }

  async function exportCSV() {
    const raw = await fetchAllTx();
    const filtered = raw.filter(passDateFilter).filter(passIslandFilter).filter(passTxRefFilter);
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `credits-history_${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storico crediti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtri */}
        <div className="rounded-md border p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Account ID</Label>
              <Input
                placeholder={companyAcc || "account:ownerType:ownerId"}
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <Label>Island ID</Label>
              <Input placeholder="es. island-A" value={islandId} onChange={(e) => setIslandId(e.target.value)} />
            </div>
            <div>
              <Label>txRef</Label>
              <Input placeholder="filtra per txRef" value={txRef} onChange={(e) => setTxRef(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px]">
            <div>
              <Label>Da data</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>A data</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label>Limite</Label>
              <Input type="number" min={10} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={applyFilters}>Applica filtri</Button>
            <Button variant="ghost" onClick={resetFilters}>Reset</Button>
            <div className="ml-auto" />
            <Button onClick={exportCSV}>Export CSV</Button>
          </div>
        </div>

        {/* Lista */}
        <CreditHistory />
      </CardContent>
    </Card>
  );
}
