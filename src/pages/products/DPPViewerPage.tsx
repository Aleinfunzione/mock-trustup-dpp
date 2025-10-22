// src/pages/products/DPPViewerPage.tsx
import * as React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { WorkflowOrchestrator } from "@/services/orchestration/WorkflowOrchestrator";
import type { VerifiablePresentation } from "@/domains/credential/entities";
import type { ComplianceReport } from "@/domains/compliance/services";
import { useCredentialStore } from "@/stores/credentialStore";
import { getProductById } from "@/services/api/products";

import { useAuth } from "@/hooks/useAuth";
import { consumeForAction, simulateCost } from "@/services/api/credits";
import type { AccountOwnerType } from "@/types/credit";
import { costOf } from "@/services/orchestration/creditsPublish";
import ProductTopBar from "@/components/products/ProductTopBar";

type Snapshot =
  | { id: string; publishedAt: string; content: VerifiablePresentation }
  | null;

function isErr<T extends { ok: boolean }>(r: T): r is T & { ok: false; reason?: unknown } {
  return r.ok === false;
}

/* -------------------- Helpers VP → compliance -------------------- */

type TrustupCompliance = {
  productComplianceStandard?: string;
  productComplianceAttrs?: Record<string, unknown>;
  productId?: string;
};

function extractCompliance(vp?: VerifiablePresentation | null): TrustupCompliance | null {
  if (!vp) return null;
  const t: any = (vp as any).trustup;
  if (!t || typeof t !== "object") return null;
  const attrs = t.productComplianceAttrs;
  if (!attrs || typeof attrs !== "object") return null;
  return {
    productComplianceStandard: t.productComplianceStandard ?? "COMPANY_PROFILE",
    productComplianceAttrs: attrs as Record<string, unknown>,
    productId: t.productId as string | undefined,
  };
}

export default function DPPViewerPage() {
  const { id: productId, dppId: routeDppId } = useParams<{ id?: string; dppId?: string }>();
  const navigate = useNavigate();

  const [vpPreview, setVpPreview] = React.useState<VerifiablePresentation | null>(null);
  const [includedCount, setIncludedCount] = React.useState<number>(0);
  const [report, setReport] = React.useState<ComplianceReport | null>(null);

  const [snapshot, setSnapshot] = React.useState<Snapshot>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [canPay, setCanPay] = React.useState(true);
  const vpCost = costOf("VP_PUBLISH" as any);

  const { org, prod, load } = useCredentialStore();
  const { currentUser } = useAuth();

  const roleBase = currentUser?.role === "company" ? "/company" : "/creator";
  const basePath = `${roleBase}/products`;

  const loadAll = React.useCallback(async () => {
    if (routeDppId) {
      setLoading(true);
      setErr(null);
      try {
        const snap = WorkflowOrchestrator.getSnapshot(routeDppId);
        if (!snap) throw new Error("Snapshot non trovato");
        setSnapshot({ id: routeDppId, publishedAt: new Date().toISOString(), content: snap });
        setVpPreview(null);
        setReport(null);
      } catch (e: any) {
        setErr(e?.message || "Errore nel caricamento snapshot VP");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!productId) return;
    setLoading(true);
    setErr(null);
    try {
      load?.();
      getProductById(productId);

      const orgVC = org || {};
      const prodVC = (prod && prod[productId]) || {};

      const res = await WorkflowOrchestrator.prepareVP(orgVC, prodVC);
      if (res.ok) {
        setVpPreview(res.vp);
        setIncludedCount(res.included);
        setReport(res.report);
      } else {
        setVpPreview(null);
        setIncludedCount(0);
        setReport(res.report);
      }
      setSnapshot(null);
    } catch (e: any) {
      setErr(e?.message || "Errore nel calcolo della VP");
    } finally {
      setLoading(false);
    }
  }, [routeDppId, productId, org, prod, load]);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  React.useEffect(() => {
    let alive = true;
    async function checkCredits() {
      try {
        const u = currentUser as any;
        const actor = {
          ownerType: (currentUser?.role ?? "company") as AccountOwnerType,
          ownerId: (u?.id ?? u?.did) as string,
          companyId: (u?.companyId ?? u?.companyDid) as string | undefined,
        };
        await (simulateCost as any)({ action: "VP_PUBLISH", ...actor });
        if (alive) setCanPay(true);
      } catch {
        if (alive) setCanPay(false);
      }
    }
    checkCredits();
    return () => {
      alive = false;
    };
  }, [currentUser?.did, currentUser?.companyDid, currentUser?.role]);

  async function onReprepare() {
    await loadAll();
  }

  async function onPublish() {
    if (!productId) return;
    setLoading(true);
    setErr(null);
    try {
      let vp = vpPreview;
      if (!vp) {
        const orgVC = org || {};
        const prodVC = (prod && prod[productId]) || {};
        const res = await WorkflowOrchestrator.prepareVP(orgVC, prodVC);
        if (!res.ok) throw new Error("Compliance incompleta: completa le credenziali richieste");
        vp = res.vp;
      }

      const u = currentUser as any;
      const actor = {
        ownerType: (currentUser?.role ?? "company") as AccountOwnerType,
        ownerId: (u?.id ?? u?.did) as string,
        companyId: (u?.companyId ?? u?.companyDid) as string | undefined,
      };
      const debit = consumeForAction("VP_PUBLISH", actor, { kind: "vp", id: productId });
      if (isErr(debit)) {
        const reason = String(debit.reason ?? "UNKNOWN");
        if (reason.includes("INSUFFICIENT")) throw new Error("Crediti insufficienti per pubblicare la VP");
        throw new Error(`Errore crediti: ${reason}`);
      }

      const result = await WorkflowOrchestrator.publishVP(vp);
      if (!result.ok) throw new Error((result as any).message ?? "Publish VP fallito");

      setSnapshot({ id: result.snapshotId, publishedAt: new Date().toISOString(), content: result.vp });

      navigate(`${roleBase}/products/${productId}/dpp`, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Errore pubblicazione VP");
    } finally {
      setLoading(false);
    }
  }

  function renderReport() {
    if (!report) return null;
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">Compliance</div>
        <div className="text-sm">Stato: {report.ok ? "✅ Completa" : "❌ Incompleta"}</div>
        {!report.ok && (
          <div className="text-xs">
            <div className="font-medium mb-1">Mancanze:</div>
            <ul className="list-disc pl-5 space-y-1">
              {report.missing.map((m, i) => (
                <li key={i}>
                  <span className="font-mono">
                    {m.scope}:{m.standard}
                  </span>{" "}
                  — {m.reason}
                  {m.fields?.length ? ` (campi: ${m.fields.join(", ")})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  function renderComplianceBlock(vp: VerifiablePresentation | null) {
    const comp = extractCompliance(vp);
    if (!comp?.productComplianceAttrs) return null;
    return (
      <div className="space-y-1">
        <div className="text-sm font-medium">
          Attributi di compliance inclusi ({comp.productComplianceStandard ?? "COMPANY_PROFILE"})
        </div>
        <pre className="text-xs p-3 rounded border overflow-auto bg-muted/30">
{JSON.stringify(comp.productComplianceAttrs, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {productId && <ProductTopBar roleBase={roleBase} productId={productId} />}

      <div className="flex items-center justify-between">
        <nav className="text-sm text-muted-foreground">
          <Link to={basePath} className="hover:underline">
            Prodotti
          </Link>
          {productId && (
            <>
              <span className="mx-1">/</span>
              <span className="text-foreground">DPP Viewer</span>
            </>
          )}
        </nav>
        <Button asChild variant="ghost" size="sm">
          <Link to={productId ? `${roleBase}/products/${productId}` : basePath}>Indietro</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">DPP Viewer → VP & Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {err && <div className="text-sm text-destructive">{err}</div>}
          {loading && <div className="text-sm text-muted-foreground">Caricamento…</div>}

          {snapshot && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Snapshot pubblicato</div>
              <div className="text-sm space-y-1">
                <div>
                  <b>ID:</b> <span className="font-mono">{snapshot.id}</span>
                </div>
                <div>
                  <b>Published:</b> {new Date(snapshot.publishedAt).toLocaleString()}
                </div>
              </div>
              {renderComplianceBlock(snapshot.content)}
              <pre className="text-xs p-3 rounded border overflow-auto bg-muted/30">
{JSON.stringify(snapshot.content, null, 2)}
              </pre>
            </div>
          )}

          {!snapshot && (vpPreview || report) && (
            <div className="space-y-3">
              {renderReport()}
              {vpPreview && (
                <>
                  <div className="text-sm">
                    <b>VP pronta</b> — credenziali incluse: <span className="font-mono">{includedCount}</span>
                  </div>
                  {renderComplianceBlock(vpPreview)}
                  <pre className="text-xs p-3 rounded border overflow-auto bg-muted/30">
{JSON.stringify(vpPreview, null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}

          {!snapshot && !vpPreview && !report && !loading && (
            <div className="text-sm text-muted-foreground">Nessun dato disponibile.</div>
          )}

          <div className="flex gap-2 pt-1 items-center flex-wrap">
            <Button variant="outline" asChild>
              <Link to={productId ? `${roleBase}/products/${productId}` : basePath}>Indietro</Link>
            </Button>
            {productId && (
              <>
                <Button variant="secondary" onClick={onReprepare} disabled={loading}>
                  Ricalcola VP
                </Button>
                <Button onClick={onPublish} disabled={loading || (report && !report.ok) || !canPay}>
                  Pubblica VP
                </Button>
                <span className="ml-auto text-xs text-muted-foreground">
                  Costo pubblicazione: <span className="font-mono">{vpCost}</span> crediti
                  {!canPay && <span className="text-destructive ml-2">• crediti insufficienti</span>}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
