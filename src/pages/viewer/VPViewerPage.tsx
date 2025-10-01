// src/pages/viewer/VPViewerPage.tsx
import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkflowOrchestrator } from "@/services/orchestration/WorkflowOrchestrator";
import { verifyVP, verifyVC } from "@/domains/credential/services";
import type { VerifiablePresentation, VerifiableCredential } from "@/domains/credential/entities";

export default function VPViewerPage() {
  const { vpId } = useParams<{ vpId: string }>();

  const [vp, setVp] = React.useState<VerifiablePresentation | null>(null);
  const [validVP, setValidVP] = React.useState<boolean | null>(null);
  const [vcResults, setVcResults] = React.useState<Array<{ idx: number; valid: boolean }>>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let alive = true;
    async function run() {
      if (!vpId) {
        setErr("Parametro :vpId mancante");
        setLoading(false);
        return;
      }
      try {
        const snap = WorkflowOrchestrator.getSnapshot(vpId);
        if (!snap) throw new Error("Snapshot VP non trovato");
        if (!alive) return;
        setVp(snap);

        // Verifica VP
        const vpres = await verifyVP(snap);
        if (!alive) return;
        setValidVP(!!vpres.valid);

        // Verifica VC incluse
        const creds = (snap.verifiableCredential || []) as VerifiableCredential[];
        const checks = await Promise.all(
          creds.map(async (vc, idx) => {
            const r = await verifyVC(vc);
            return { idx, valid: !!r.valid };
          })
        );
        if (!alive) return;
        setVcResults(checks);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Errore caricamento/verifica VP");
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [vpId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">VP Viewer</CardTitle>
          <CardDescription>Verifica presentazione e credenziali incluse.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {err && <div className="text-sm text-destructive">{err}</div>}
          {loading && <div className="text-sm text-muted-foreground">Caricamento…</div>}

          {vp && (
            <>
              <div className="text-sm">VP: {validVP === null ? "…" : validVP ? "✅ valida" : "❌ non valida"}</div>
              {vcResults.length > 0 && (
                <div className="text-sm">
                  VC incluse:
                  <ul className="list-disc pl-5 mt-1">
                    {vcResults.map((r) => (
                      <li key={r.idx}>
                        VC #{r.idx + 1}: {r.valid ? "✅ valida" : "❌ non valida"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <pre className="text-xs p-3 rounded border overflow-auto bg-muted/30 max-h-[60vh]">
{JSON.stringify(vp, null, 2)}
              </pre>
            </>
          )}

          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="..">Indietro</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
