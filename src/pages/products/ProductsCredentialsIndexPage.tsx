// src/pages/products/ProductsCredentialsIndexPage.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { listVCs } from "@/services/api/vc";
import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";

type AnyVC = {
  id: string;
  standardId?: StandardId | string;
  createdAt?: string;
  revokedAt?: string | null;
  supersededBy?: string | null;
  billing?: { cost?: number; payerType?: string; payerAccountId?: string; txRef?: string };
  data?: any;
  metadata?: any;
};

type StatusFilter = "all" | "valid" | "active" | "revoked" | "superseded";

function stdLabel(std?: string) {
  if (!std) return "—";
  try {
    // @ts-ignore
    return StandardsRegistry[std as StandardId]?.label ?? StandardsRegistry[std as StandardId]?.title ?? std;
  } catch {
    return std;
  }
}

export default function ProductsCredentialsIndexPage() {
  const { currentUser } = useAuth();
  const roleBase = currentUser?.role === "company" ? "/company" : "/creator";

  const [rows, setRows] = React.useState<AnyVC[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  // filtri
  const [q, setQ] = React.useState(""); // productId o testo libero
  const [status, setStatus] = React.useState<StatusFilter>("all");

  const historyForTx = (tx?: string) =>
    tx ? `/company/credits/history?txRef=${encodeURIComponent(tx)}` : "#";

  const loadVCs = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const baseQuery: any = { subjectType: "product" };
      if (status === "valid") baseQuery.status = "valid";
      // server-side productId se presente
      if (q.trim()) baseQuery.subjectId = q.trim();

      let res: AnyVC[] = [];
      try {
        // @ts-ignore accept object query
        res = (await (listVCs as any)(baseQuery)) as AnyVC[];
      } catch {
        // fallback: carica tutto e filtra client
        const all = (await (listVCs as any)()) as AnyVC[];
        res = (all || []).filter((vc) => {
          const scope = vc?.metadata?.scope ?? vc?.metadata?.target ?? vc?.data?.scope;
          const pid =
            vc?.data?.productId ?? vc?.metadata?.productId ?? vc?.metadata?.targetId;
          const okScope = scope === "product" || !!pid;
          const okPid = q.trim() ? (pid === q.trim()) : true;
          return okScope && okPid;
        });
      }

      // filtro client per stati extra
      const filtered =
        status === "all"
          ? res
          : status === "active"
          ? res.filter((vc) => !vc.revokedAt && !vc.supersededBy)
          : status === "revoked"
          ? res.filter((vc) => !!vc.revokedAt)
          : status === "superseded"
          ? res.filter((vc) => !!vc.supersededBy)
          : res; // valid già server-side

      setRows(filtered);
    } catch (e: any) {
      setErr(e?.message || "Errore nel caricamento delle credenziali");
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  React.useEffect(() => {
    loadVCs();
  }, [loadVCs]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Credenziali di prodotto — indice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filtri */}
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="grid gap-1">
              <Label htmlFor="productId">Product ID</Label>
              <Input
                id="productId"
                placeholder="productId…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="md:w-64"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="status">Stato</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">Tutti</option>
                <option value="valid">Valid</option>
                <option value="active">Active (non revoc./supers.)</option>
                <option value="revoked">Revoked</option>
                <option value="superseded">Superseded</option>
              </select>
            </div>
            <div className="md:ml-auto flex gap-2">
              <Button variant="secondary" onClick={loadVCs} disabled={loading}>
                Applica filtri
              </Button>
            </div>
          </div>

          <div className="overflow-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-3 py-2">Standard</th>
                  <th className="text-left px-3 py-2">Product ID</th>
                  <th className="text-left px-3 py-2">VC ID</th>
                  <th className="text-left px-3 py-2">Stato</th>
                  <th className="text-left px-3 py-2">Costo/Payer</th>
                  <th className="text-right px-3 py-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-6 text-muted-foreground" colSpan={6}>
                      Caricamento…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-muted-foreground" colSpan={6}>
                      Nessuna credenziale trovata
                    </td>
                  </tr>
                ) : (
                  rows.map((vc) => {
                    const std =
                      (vc.standardId as string) ||
                      vc?.data?.standardId ||
                      vc?.metadata?.standardId;
                    const pid =
                      vc?.data?.productId ?? vc?.metadata?.productId ?? vc?.metadata?.targetId ?? "—";
                    const statusLabel = vc.revokedAt
                      ? "revoked"
                      : vc.supersededBy
                      ? "superseded"
                      : "active";
                    const cost = vc.billing?.cost ?? (vc as any)?.billing?.amount;
                    const payer = vc.billing?.payerType ?? (vc as any)?.billing?.payerType;
                    const txRef = vc.billing?.txRef ?? (vc as any)?.billing?.txRef;

                    return (
                      <tr key={vc.id} className="border-t">
                        <td className="px-3 py-2">{stdLabel(std)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{pid}</td>
                        <td className="px-3 py-2 font-mono text-xs">{vc.id}</td>
                        <td className="px-3 py-2">
                          <Badge variant={statusLabel === "active" ? "default" : "outline"}>
                            {statusLabel}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {typeof cost === "number" ? `€ ${cost}` : "—"}
                          {payer ? ` • ${payer}` : ""}
                          {txRef && (
                            <>
                              {" • "}
                              <Link to={historyForTx(txRef)} className="underline font-mono">
                                {txRef}
                              </Link>
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`${roleBase}/products/${pid}`}>Apri prodotto</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
