// src/pages/dev/DevQaPage.tsx
import * as React from "react";
import { runAll } from "@/dev/qaCredits";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DevQaPage() {
  const [res, setRes] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function onRun() {
    setLoading(true);
    setErr(null);
    try {
      const out = await runAll();
      setRes(out);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? String(e));
      setRes(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>QA Crediti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={onRun} disabled={loading}>
          {loading ? "Esecuzione…" : "Esegui test"}
        </Button>
        {err && <div className="text-sm text-destructive">Errore: {err}</div>}
        {res && (
          <div className="text-sm space-y-1">
            <div>Idempotenza spend: <b>{res.idemOk ? "OK" : "FAIL"}</b></div>
            <div>Payer assegnatario: <b>{res.payerMemberOk ? "OK" : "FAIL"}</b></div>
            <div>Bucket isola scalato: <b>{res.bucketUsedOk ? "OK" : "FAIL"}</b></div>
            <pre className="mt-2 text-xs whitespace-pre-wrap font-mono">
{JSON.stringify({ balances: res.balances, bucket: res.bucket }, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
