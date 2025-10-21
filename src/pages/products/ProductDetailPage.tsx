// src/pages/products/ProductDetailPage.tsx
import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import EventTimeline from "@/components/events/EventTimeline";
import EventForm from "@/components/events/EventForm";
import BOMEditor from "@/components/products/BOMEditor";

import { useProducts } from "@/hooks/useProducts";
import { useAuthStore } from "@/stores/authStore";
import { getActor } from "@/services/api/identity";
import { getProductById, listProductsByCompany } from "@/services/api/products";
import { getIsland } from "@/stores/orgStore";

// VC + export
import { listVCs, verifyIntegrity } from "@/services/api/vc";
import { exportVC, exportVP } from "@/services/standards/export";
import { exportEPCISFromProductId } from "@/services/standards/epcis";
import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";

import type { BomNode } from "@/types/product";
import type { Product } from "@/types/product";

type AnyVC = {
  id: string;
  standardId?: StandardId | string;
  createdAt?: string;
  revokedAt?: string | null;
  supersededBy?: string | null;
  billing?: {
    cost?: number;
    payerType?: string;
    payerAccountId?: string;
    txRef?: string;
  };
  proof?: unknown;
  data?: any;
  metadata?: any;
};

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { listMine } = useProducts();
  const { currentUser } = useAuthStore();

  const role = currentUser?.role;
  const roleBase = role === "company" ? "/company" : role === "creator" ? "/creator" : "";
  const basePath =
    role === "company" ? "/company/products" :
    role === "creator" ? "/creator/products" :
    "/products";

  const actor = currentUser?.did ? getActor(currentUser.did) : undefined;
  const companyDid = currentUser?.companyDid ?? actor?.companyDid;

  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [assigneeDid, setAssigneeDid] = React.useState("");
  const [timelineKey, setTimelineKey] = React.useState(0);
  const [bomLocal, setBomLocal] = React.useState<BomNode[]>([]);

  // VC state
  const [vcs, setVcs] = React.useState<AnyVC[]>([]);
  const [vcsLoading, setVcsLoading] = React.useState<boolean>(false);
  const [integrityMap, setIntegrityMap] = React.useState<Record<string, boolean>>({});
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null);
  const [onlyValid, setOnlyValid] = React.useState<boolean>(true);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) return;
      setLoading(true);

      let p: Product | undefined;
      try {
        const mine = typeof listMine === "function" ? listMine() : [];
        p = mine?.find((x: any) => x?.id === id);
      } catch {}

      if (!p) {
        try { p = getProductById(id) as Product | undefined; } catch {}
      }

      if (!p && companyDid) {
        try {
          const list = listProductsByCompany(companyDid);
          p = list.find((x: any) => x?.id === id);
        } catch {}
      }

      if (mounted) {
        setProduct(p ?? null);
        setLoading(false);
        setBomLocal((p as any)?.bom ?? []);
      }
    }

    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, companyDid]);

  // Load product VCs
  React.useEffect(() => {
    let mounted = true;
    async function loadVCs() {
      if (!id) return;
      setVcsLoading(true);
      try {
        // Prefer API filter; fallback a filtro client.
        let res: AnyVC[] = [];
        try {
          // @ts-ignore
          res = (await (listVCs as any)({ type: "product", productId: id })) as AnyVC[];
        } catch {
          const all = (await (listVCs as any)()) as AnyVC[];
          res = (all || []).filter((vc) => {
            const pid =
              vc?.data?.productId ??
              vc?.metadata?.productId ??
              vc?.metadata?.targetId;
            const scope =
              vc?.metadata?.scope ?? vc?.metadata?.target ?? vc?.data?.scope;
            return pid === id || scope === "product";
          });
        }
        if (!mounted) return;
        setVcs(res || []);

        // integrità
        const integ: Record<string, boolean> = {};
        for (const vc of res || []) {
          try {
            const r = await verifyIntegrity(vc as any);
            const ok = (r as any)?.ok ?? (r as any)?.valid ?? false;
            integ[vc.id] = !!ok;
          } catch {
            integ[vc.id] = false;
          }
        }
        if (mounted) setIntegrityMap(integ);
      } finally {
        if (mounted) setVcsLoading(false);
      }
    }
    loadVCs();
    return () => { mounted = false; };
  }, [id]);

  if (!id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ID prodotto mancante</CardTitle>
          <CardDescription>La route non contiene un parametro :id valido.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to={basePath}>Torna ai prodotti</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Caricamento prodotto…</CardTitle>
        </CardHeader>
        <CardContent />
      </Card>
    );
  }

  if (!product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prodotto non trovato</CardTitle>
          <CardDescription>
            Nessun prodotto con ID <span className="font-mono">{id}</span> nel tuo contesto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>Torna indietro</Button>
          <Button asChild variant="outline"><Link to={basePath}>Vai alla lista</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const prodAny = product as any;
  const productTypeLabel =
    (prodAny.type ??
      prodAny.typeId ??
      prodAny.productTypeId ??
      prodAny.productType?.name ??
      "—") as string;

  const attributesHref = roleBase ? `${roleBase}/products/${id}/attributes` : undefined;
  const credentialsHref = roleBase ? `${roleBase}/products/${id}/credentials` : undefined;
  const dppHref = roleBase ? `${roleBase}/products/${id}/dpp` : undefined;

  const isPublished = !!prodAny.isPublished;
  const dppId = prodAny.dppId as string | undefined;

  const islandId: string | undefined = prodAny.islandId;
  const islandName =
    islandId && companyDid ? (getIsland(companyDid, islandId)?.name ?? islandId) : undefined;

  const publishedBadge = isPublished ? (
    <span className="ml-2 inline-flex items-center rounded bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs">
      Pubblicato
    </span>
  ) : (
    <span className="ml-2 inline-flex items-center rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-xs">
      Bozza
    </span>
  );

  // Helpers UI VC
  function stdLabel(std?: string) {
    if (!std) return "—";
    try {
      // @ts-ignore
      return StandardsRegistry[std as StandardId]?.label ?? StandardsRegistry[std as StandardId]?.title ?? std;
    } catch {
      return std;
    }
  }

  async function handleExportVP() {
    const vp = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      holder: prodAny?.id,
      verifiableCredential: vcs,
      meta: {
        productId: prodAny?.id,
        name: prodAny?.name,
        generatedAt: new Date().toISOString(),
      },
    };
    exportVP(vp, prodAny?.name || "product");
  }

  async function handleExportEPCIS() {
    await exportEPCISFromProductId(prodAny.id);
  }

  async function handleVerify(vc: AnyVC) {
    setVerifyingId(vc.id);
    try {
      const r = await verifyIntegrity(vc as any);
      const ok = (r as any)?.ok ?? (r as any)?.valid ?? false;
      setIntegrityMap((prev) => ({ ...prev, [vc.id]: !!ok }));
    } finally {
      setVerifyingId(null);
    }
  }

  const historyForTx = (tx?: string) =>
    tx ? `/company/credits/history?txRef=${encodeURIComponent(tx)}` : "#";

  const displayVCs = React.useMemo(() => {
    if (!onlyValid) return vcs;
    return (vcs || []).filter((vc) => !vc.revokedAt && !vc.supersededBy);
  }, [vcs, onlyValid]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb + back */}
      <div className="flex items-center justify-between">
        <nav className="text-sm text-muted-foreground">
          <Link to={basePath} className="hover:underline">Prodotti</Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">{(prodAny.name as string) ?? "Prodotto"}</span>
        </nav>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>Indietro</Button>
      </div>

      {/* Header prodotto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>{prodAny.name ?? "Prodotto"}</span>
              {publishedBadge}
              {islandName && <Badge variant="secondary">Isola: {islandName}</Badge>}
            </span>
            <span className="text-sm font-normal text-muted-foreground font-mono">
              {prodAny.id}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Tipo:</span> {productTypeLabel}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            Azienda: {prodAny.companyDid ?? currentUser?.companyDid ?? "—"}
          </div>

          {/* Azioni rapide */}
          <div className="mt-2 flex flex-wrap gap-2">
            {attributesHref && (
              <Button asChild variant="outline" size="sm">
                <Link to={attributesHref}>Caratteristiche</Link>
              </Button>
            )}
            {credentialsHref && (
              <Button asChild variant="outline" size="sm">
                <Link to={credentialsHref}>Credenziali</Link>
              </Button>
            )}
            {dppHref && (
              <Button asChild size="sm">
                <Link to={dppHref}>DPP Viewer</Link>
              </Button>
            )}
            {isPublished && dppId && (
              <Button asChild variant="secondary" size="sm">
                <Link to={dppHref!}>Snapshot: {String(dppId).slice(0, 12)}…</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Certificazioni prodotto */}
      <Card>
        <CardHeader>
          <CardTitle>Certificazioni</CardTitle>
          <CardDescription>VC associate a questo prodotto. Integrità e costo mostrati se disponibili.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExportVP} size="sm">
                Export VP (JSON-LD)
              </Button>
              <Button onClick={handleExportEPCIS} variant="outline" size="sm" title="EPCIS JSON-LD con certificazioni">
                Export EPCIS
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="only-valid" checked={onlyValid} onCheckedChange={(c) => setOnlyValid(!!c)} />
              <Label htmlFor="only-valid" className="text-sm">Solo valide</Label>
              <span className="text-xs text-muted-foreground ml-2">({displayVCs.length}/{vcs.length})</span>
            </div>
          </div>

          {vcsLoading ? (
            <div className="text-sm text-muted-foreground">Caricamento certificazioni…</div>
          ) : displayVCs.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nessuna VC prodotto trovata.</div>
          ) : (
            <div className="space-y-2">
              {displayVCs.map((vc) => {
                const ok = integrityMap[vc.id] ?? false;
                const std = (vc.standardId as string) || vc?.data?.standardId || vc?.metadata?.standardId;
                const status = vc.revokedAt ? "revoked" : vc.supersededBy ? "superseded" : "active";
                const cost = vc.billing?.cost ?? (vc as any)?.billing?.amount;
                const payerType = vc.billing?.payerType ?? (vc as any)?.billing?.payerType;
                const payerAccountId =
                  vc.billing?.payerAccountId ??
                  (vc as any)?.billing?.payerAccountId ??
                  (vc as any)?.billing?.payerId;
                const txRef =
                  vc.billing?.txRef ??
                  (vc as any)?.billing?.txRef;

                return (
                  <div
                    key={vc.id}
                    className="flex flex-col gap-1 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stdLabel(std)}</span>
                        <Badge variant={ok ? "default" : "destructive"}>
                          {ok ? "Integrità OK" : "Integrità KO"}
                        </Badge>
                        <Badge variant="outline">{status}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">{vc.id}</span>
                        {typeof cost === "number" && (
                          <span className="ml-2">• costo: {cost}</span>
                        )}
                        {payerType && <span className="ml-2">• payer: {payerType}</span>}
                        {payerAccountId && (
                          <span className="ml-2">• account: <span className="font-mono">{payerAccountId}</span></span>
                        )}
                        {txRef && (
                          <span className="ml-2">
                            • tx:{" "}
                            <Link to={historyForTx(txRef)} className="underline font-mono">
                              {txRef}
                            </Link>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex shrink-0 gap-2 md:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerify(vc)}
                        disabled={verifyingId === vc.id}
                      >
                        {verifyingId === vc.id ? "Verifica…" : "Verifica"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportVC(vc as any, `${prodAny?.name || "product"}_${std || "VC"}`)}
                      >
                        Export VC
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registra evento + assegnazione opzionale */}
      <Card>
        <CardHeader>
          <CardTitle>Registra evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assignee">Assegna a DID (opzionale)</Label>
            <Input
              id="assignee"
              placeholder="did:iota:xyz… (operatore o macchina)"
              value={assigneeDid}
              onChange={(e) => setAssigneeDid(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se valorizzato, l’evento comparirà nella dashboard dell’assegnatario.
            </p>
          </div>

          <EventForm
            defaultProductId={prodAny.id}
            assignedToDid={assigneeDid || undefined}
            onCreated={() => setTimelineKey((k) => k + 1)}
          />
        </CardContent>
      </Card>

      {/* Distinta base (BOM) */}
      <Card>
        <CardHeader>
          <CardTitle>Distinta base (BOM)</CardTitle>
        </CardHeader>
        <CardContent>
          <BOMEditor
            value={bomLocal}
            onChange={setBomLocal}
            productId={prodAny.id}
            onSaved={(next) => {
              setBomLocal(next);
              setTimelineKey((k) => k + 1);
            }}
          />
        </CardContent>
      </Card>

      {/* Timeline eventi */}
      <EventTimeline key={timelineKey} productId={prodAny.id} />
    </div>
  );
}
