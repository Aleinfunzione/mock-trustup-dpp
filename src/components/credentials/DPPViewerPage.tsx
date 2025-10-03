// src/pages/credentials/DPPViewerPage.tsx
import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";
import { getProductById } from "@/services/api/products";
import { canAfford, costOf, publishVPWithCredits } from "@/services/orchestration/creditsPublish";

type PublishResult = {
  vpId?: string;
  vp?: any;
  creditTx?: any;
  payerAccountId?: string;
  [k: string]: any;
};

export default function DPPViewerPage() {
  const { id: productId } = useParams<{ id: string }>();
  const { currentUser } = useAuthStore();

  const [productName, setProductName] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);
  const [canPay, setCanPay] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [infoMsg, setInfoMsg] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<PublishResult | null>(null);

  const vpCost = costOf("VP_PUBLISH" as any);

  React.useEffect(() => {
    if (!productId) return;
    try {
      const p = getProductById(productId);
      setProductName((p as any)?.name || (p as any)?.title || productId);
    } catch {
      setProductName(productId);
    }
  }, [productId]);

  // Pre-gating crediti
  React.useEffect(() => {
    let alive = true;
    async function checkCredits() {
      if (!currentUser?.did) { setCanPay(true); return; }
      try {
        const ok = await canAfford("VP_PUBLISH" as any, {
          payer: currentUser.did,
          company: currentUser.companyDid,
        } as any);
        if (alive) setCanPay(ok);
      } catch {
        if (alive) setCanPay(false);
      }
    }
    checkCredits();
    return () => { alive = false; };
  }, [currentUser?.did, currentUser?.companyDid]);

  async function handlePublish() {
    if (!productId || !currentUser?.did) return;
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    setResult(null);
    try {
      const res = await publishVPWithCredits(productId, {
        payer: currentUser.did,
        company: currentUser.companyDid,
      } as any);
      setResult(res as any);
      setInfoMsg("VP pubblicata con successo.");
    } catch (e: any) {
      const msg = e?.message || "Errore pubblicazione VP";
      setErrorMsg(msg);
    } finally {
      setBusy(false);
    }
  }

  if (!productId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prodotto non specificato</CardTitle>
          <CardDescription>Route senza parametro :id.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline"><Link to="..">Indietro</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const vpId = result?.vpId || (result as any)?.id || (result?.vp && (result.vp.id || result.vp.vpId));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Digital Product Passport • VP</CardTitle>
          <CardDescription>
            {productName ? <span>Progetto <span className="font-mono">{productName}</span></span> : "Progetto"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Product ID</Label>
              <Input value={productId} readOnly className="font-mono" />
            </div>
            <div className="self-end text-xs text-muted-foreground">
              Costo pubblicazione: <span className="font-mono">{vpCost}</span> crediti
              {!canPay && <span className="text-destructive ml-2">• crediti insufficienti</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="..">Indietro</Link>
            </Button>
            <Button onClick={handlePublish} disabled={busy || !canPay}>
              {busy ? "Pubblico…" : "Genera e pubblica VP"}
            </Button>
            {vpId && (
              <Button asChild variant="secondary">
                <Link to={`/viewer/${encodeURIComponent(vpId)}`}>Apri viewer pubblico</Link>
              </Button>
            )}
          </div>

          {errorMsg && <div className="text-sm text-destructive">{errorMsg}</div>}
          {infoMsg && <div className="text-sm">{infoMsg}</div>}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Output pubblicazione</CardTitle>
            <CardDescription>
              {result.payerAccountId ? (
                <span>Tx crediti su <span className="font-mono">{result.payerAccountId}</span></span>
              ) : (
                "Dettagli operazione"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs p-3 rounded border overflow-auto bg-muted/30">
{JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            {vpId ? (
              <>VP ID: <span className="font-mono">{vpId}</span></>
            ) : (
              "Nessun ID VP rilevato dal risultato."
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
