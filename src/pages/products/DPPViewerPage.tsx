// src/pages/products/DPPViewerPage.tsx
import * as React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { aggregateDPP, getPublishedDPP, publishDPP } from "@/services/dpp/aggregate";
import { getProductById } from "@/services/api/products";

type Snapshot = {
  id: string;
  publishedAt: string;
  digest: string;
  content: any;
} | null;

export default function DPPViewerPage() {
  const { id: productId, dppId: routeDppId } = useParams<{ id?: string; dppId?: string }>();
  const navigate = useNavigate();

  const [draft, setDraft] = React.useState<{ digest: string; content: any } | null>(null);
  const [snapshot, setSnapshot] = React.useState<Snapshot>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!productId && !routeDppId) return;
    setLoading(true);
    setErr(null);
    try {
      // Se è passato un dppId esplicito, mostra direttamente lo snapshot
      if (routeDppId) {
        const snap = getPublishedDPP(routeDppId);
        setSnapshot(snap);
        setDraft(null);
        return;
      }

      // Altrimenti carica prodotto e stato corrente
      const p = getProductById(productId!);
      // Bozza sempre ricalcolata per sicurezza
      const aggr = await aggregateDPP(productId!);
      setDraft({ digest: aggr.digest, content: aggr.draft });

      // Snapshot se pubblicato
      const dppId = (p as any)?.dppId as string | undefined;
      if (dppId) {
        const snap = getPublishedDPP(dppId);
        setSnapshot(snap);
      } else {
        setSnapshot(null);
      }
    } catch (e: any) {
      setErr(e?.message || "Errore nel caricamento DPP");
    } finally {
      setLoading(false);
    }
  }, [productId, routeDppId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onReaggregate() {
    if (!productId) return;
    setLoading(true);
    setErr(null);
    try {
      const aggr = await aggregateDPP(productId);
      setDraft({ digest: aggr.digest, content: aggr.draft });
    } catch (e: any) {
      setErr(e?.message || "Errore ricalcolo bozza");
    } finally {
      setLoading(false);
    }
  }

  async function onPublish() {
    if (!productId) return;
    setLoading(true);
    setErr(null);
    try {
      const { dppId, digest } = await publishDPP(productId);
      const snap = getPublishedDPP(dppId);
      setSnapshot(snap);
      // opzionale: naviga per avere URL stabile allo snapshot
      navigate(`/company/products/${productId}/dpp`, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Errore pubblicazione");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">DPP Viewer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {err && <div className="text-sm text-destructive">{err}</div>}

          {loading && <div className="text-sm text-muted-foreground">Caricamento…</div>}

          {/* Snapshot pubblicato */}
          {snapshot && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Snapshot pubblicato</div>
              <div className="text-sm space-y-1">
                <div>
                  <b>ID:</b> <span className="font-mono">{snapshot.id}</span>
                </div>
                <div>
                  <b>Digest:</b> <span className="font-mono">{snapshot.digest}</span>
                </div>
                <div>
                  <b>Published:</b> {new Date(snapshot.publishedAt).toLocaleString()}
                </div>
              </div>
              <pre className="text-xs p-3 rounded border overflow-auto bg-muted/30">
{JSON.stringify(snapshot.content, null, 2)}
              </pre>
            </div>
          )}

          {/* Bozza corrente */}
          {draft && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Bozza corrente</div>
              <div className="text-sm">
                <b>Digest:</b> <span className="font-mono">{draft.digest}</span>
              </div>
              <pre className="text-xs p-3 rounded border overflow-auto bg-muted/30">
{JSON.stringify(draft.content, null, 2)}
              </pre>
            </div>
          )}

          {!snapshot && !draft && !loading && (
            <div className="text-sm text-muted-foreground">Nessun dato DPP disponibile.</div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" asChild>
              <Link to="..">Indietro</Link>
            </Button>
            {productId && (
              <>
                <Button variant="secondary" onClick={onReaggregate} disabled={loading}>
                  Ricalcola bozza
                </Button>
                <Button onClick={onPublish} disabled={loading}>
                  Pubblica DPP
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
