// src/pages/dev/CreditsQAPage.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as cs from "@/stores/creditStore";
import { clearByPrefix } from "@/utils/storage";
import { useAuth } from "@/hooks/useAuth";

type AnyFn = (...a: any[]) => any;

export default function CreditsQAPage() {
  const { currentUser } = useAuth();
  const companyId = (currentUser as any)?.companyId;
  const actorDid = (currentUser as any)?.did;

  const [islandId, setIslandId] = React.useState("isola-1");
  const [bucketBefore, setBucketBefore] = React.useState<number | null>(null);
  const [bucketAfter, setBucketAfter] = React.useState<number | null>(null);
  const [lastTx, setLastTx] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const actor = React.useMemo(
    () => ({
      ownerType: (currentUser as any)?.role || "creator",
      ownerId: actorDid,
      companyId,
    }),
    [actorDid, companyId, currentUser]
  );

  async function seed() {
    try {
      setError(null);
      cs.__resetAll?.();
      cs.initCredits?.({ adminId: "did:mock:admin", companyId });
      cs.setIslandBudget?.(companyId, islandId, 20);
      setBucketBefore(cs.getIslandBudget?.(companyId, islandId) ?? null);
      setBucketAfter(null);
      setLastTx(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  function clearCreditsStorage() {
    try {
      setError(null);
      clearByPrefix("trustup:credits");
      setBucketBefore(null);
      setBucketAfter(null);
      setLastTx(null);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function runBucketTest() {
    setError(null);
    setLastTx(null);
    try {
      const before = cs.getIslandBudget?.(companyId, islandId) ?? 0;
      setBucketBefore(before);

      const consume: AnyFn = (cs as any).consume ?? (cs as any).spend;
      if (typeof consume !== "function") throw new Error("consume/spend non disponibili");

      const res = await consume("EVENT_CREATE", actor, { islandId }, 1);
      if (!res?.ok) throw new Error(`FAIL consume: ${res?.reason}`);

      const after = cs.getIslandBudget?.(companyId, islandId) ?? 0;
      setBucketAfter(after);

      const delta = before - after;
      const payerType = res.tx?.meta?.payerType;
      const bucketOk = delta === 1 || payerType === "member"; // policy-aware

      setLastTx({
        bucketOk,
        delta,
        payerType,
        refIslandId: res.tx?.meta?.ref?.islandId,
        // legacy debug (non usato per l'esito)
        islandBucketCharged: res.tx?.meta?.islandBucketCharged,
        txId: res.tx?.id,
        cost: res.cost,
      });
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <Card className="bg-neutral-900/50 text-neutral-100">
        <CardHeader>
          <CardTitle>QA Crediti · Bucket Isola</CardTitle>
          <CardDescription className="text-neutral-300">
            PASS se il budget isola diminuisce di 1 <b>oppure</b> se il payer è <code>member</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="text-sm">
              <div>Azienda (companyId): <code>{companyId || "n/d"}</code></div>
              <div>Actor DID: <code>{actorDid || "n/d"}</code></div>
              <div>Ruolo: <code>{(currentUser as any)?.role || "n/d"}</code></div>
            </div>
            <div className="flex items-center gap-2">
              <Input value={islandId} onChange={(e) => setIslandId(e.target.value)} className="max-w-xs" />
              <Button onClick={runBucketTest}>Esegui test</Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={seed}>Seed + Budget 20</Button>
            <Button variant="destructive" onClick={clearCreditsStorage}>Reset crediti</Button>
          </div>

          {error && <pre className="text-red-400 text-sm whitespace-pre-wrap">Errore: {error}</pre>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-black/30 rounded">
              <div className="opacity-70">Bucket prima</div>
              <div className="text-lg">{bucketBefore ?? "—"}</div>
            </div>
            <div className="p-3 bg-black/30 rounded">
              <div className="opacity-70">Bucket dopo</div>
              <div className="text-lg">{bucketAfter ?? "—"}</div>
            </div>
            <div className="p-3 bg-black/30 rounded">
              <div className="opacity-70">Delta</div>
              <div className="text-lg">
                {bucketBefore != null && bucketAfter != null ? bucketBefore - bucketAfter : "—"}
              </div>
            </div>
          </div>

          {lastTx && (
            <div className="space-y-1 text-sm">
              <div>Esito bucket: <b className={lastTx.bucketOk ? "text-emerald-400" : "text-red-400"}>
                {lastTx.bucketOk ? "OK" : "FAIL"}
              </b></div>
              <div>Payer: <b>{String(lastTx.payerType ?? "n/d")}</b></div>
              <div>ref.islandId: <b>{String(lastTx.refIslandId ?? "n/d")}</b></div>
              <div>Delta calcolato: <b>{String(lastTx.delta)}</b></div>
              <div>Cost: <b>{String(lastTx.cost ?? "n/d")}</b></div>
              <div>Tx: <code>{lastTx.txId}</code></div>
              {lastTx.islandBucketCharged !== undefined && (
                <div className="opacity-70">legacy islandBucketCharged: {String(lastTx.islandBucketCharged)}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
