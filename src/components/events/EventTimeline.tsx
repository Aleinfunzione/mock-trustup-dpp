// src/components/events/EventTimeline.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useEvents } from "@/hooks/useEvents";
import type { UIEvent } from "@/hooks/useEvents";
import { costOf } from "@/services/orchestration/creditsPublish";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Filters = {
  islandId?: string;
  assignedToDid?: string;
};

type Props = {
  productId: string;
  title?: string;
  showVerify?: boolean;
  /** Filtri opzionali: per isola e/o assegnatario */
  filters?: Filters;
};

function fmtCredits(n: number) {
  if (!Number.isFinite(n)) return String(n);
  const s = n.toFixed(3);
  return s.replace(/\.?0+$/, "");
}

function deriveCost(e: UIEvent): number | undefined {
  const anyE = e as any;
  const fromPayload =
    anyE.cost ??
    anyE.data?.cost ??
    anyE.meta?.cost ??
    anyE.data?.billing?.cost;
  if (Number.isFinite(fromPayload)) return Number(fromPayload);

  // fallback: prova mapping per tipo, poi EVENT_CREATE
  const byType = Number(costOf((e.type as any) ?? "EVENT_CREATE"));
  if (Number.isFinite(byType) && byType > 0) return byType;

  const generic = Number(costOf("EVENT_CREATE" as any));
  return Number.isFinite(generic) ? generic : undefined;
}

function deriveBucket(e: UIEvent): string | undefined {
  const anyE = e as any;
  return (
    anyE.islandBucketCharged ??
    anyE.meta?.islandBucketCharged ??
    anyE.data?.islandBucketCharged ??
    anyE.data?.billing?.islandBucketCharged ??
    anyE.ref?.meta?.islandBucketCharged
  );
}

export default function EventTimeline({
  productId,
  title = "Timeline eventi",
  showVerify = true,
  filters,
}: Props) {
  const { toast } = useToast();
  const { listByProduct, verifyEventIntegrity } = useEvents();

  const [rows, setRows] = React.useState<UIEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [verifying, setVerifying] = React.useState<Record<string, boolean>>({});
  const [integrity, setIntegrity] = React.useState<Record<string, boolean | null>>({});

  // Caricamento eventi del prodotto
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await listByProduct(productId);
        if (!mounted) return;
        data.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setRows(data);
        setIntegrity({});
      } catch (err: any) {
        if (!mounted) return;
        toast({
          title: "Errore nel caricamento timeline",
          description: err?.message ?? "Impossibile leggere gli eventi.",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [productId]); // deliberate: no listByProduct/toast in deps

  // Applica filtri client-side se passati via props
  const visible = React.useMemo(() => {
    if (!filters) return rows;
    return rows.filter((e) => {
      const islandOk = !filters.islandId || (e as any)?.data?.islandId === filters.islandId;
      const assigneeOk = !filters.assignedToDid || e.assignedToDid === filters.assignedToDid;
      return islandOk && assigneeOk;
    });
  }, [rows, filters]);

  const handleVerify = async (id: string) => {
    try {
      setVerifying((s) => ({ ...s, [id]: true }));
      const rec = rows.find((r) => r.id === id);
      if (!rec) return;
      const ok = await verifyEventIntegrity(rec);
      setIntegrity((m) => ({ ...m, [id]: !!ok }));
    } catch {
      setIntegrity((m) => ({ ...m, [id]: false }));
    } finally {
      setVerifying((s) => ({ ...s, [id]: false }));
    }
  };

  return (
    <Card className="w-full relative z-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="relative z-0 overflow-hidden">
        {/* Barra filtri attivi */}
        {filters && (filters.islandId || filters.assignedToDid) && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Filtri:</span>
            {filters.islandId && <Badge variant="outline">Isola: {filters.islandId}</Badge>}
            {filters.assignedToDid && (
              <Badge variant="outline">Assegnato a: {filters.assignedToDid}</Badge>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground">Caricamento…</div>
        ) : visible.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nessun evento {filters ? "per i filtri correnti" : "registrato per questo prodotto"}.
          </div>
        ) : (
          <ol className="relative border-s border-neutral-300 dark:border-neutral-700">
            {visible.map((e) => {
              const statusColor =
                e.status === "done"
                  ? "bg-emerald-600"
                  : e.status === "in_progress"
                  ? "bg-blue-600"
                  : "bg-amber-600";

              const intg = integrity[e.id];
              const verifyingRow = verifying[e.id];

              const scope = (e as any).data?.scope as "product" | "bom" | undefined;
              const targetLabel = (e as any).data?.targetLabel as string | undefined;
              const islandId = (e as any).data?.islandId as string | undefined;
              const txRef =
                (e as any).data?.txRef ||
                (e as any).data?.txId ||
                (e as any).meta?.txId ||
                undefined;

              const cost = deriveCost(e);
              const bucketId = deriveBucket(e);

              return (
                <li key={e.id} className="mb-10 ms-6">
                  <span className="absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-8 ring-background">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <time className="text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString()}
                    </time>
                    <Badge variant="secondary">{e.type}</Badge>
                    <Badge className={statusColor + " text-white"}>{e.status}</Badge>
                    {scope && (
                      <Badge variant="outline">
                        {scope === "product" ? "Prodotto" : "BOM"}
                        {targetLabel ? ` • ${targetLabel}` : ""}
                      </Badge>
                    )}
                    {islandId && <Badge variant="outline">Isola: {islandId}</Badge>}
                    {e.assignedToDid && <Badge variant="outline">→ {e.assignedToDid}</Badge>}

                    <TooltipProvider delayDuration={200}>
                      {typeof cost === "number" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline">Costo: {fmtCredits(cost)} cr</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className="text-xs">Crediti addebitati per questa azione</span>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {bucketId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-xs">
                              bucket:{bucketId}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className="text-xs">Bucket isola addebitato</span>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>

                    {txRef && (
                      <Badge variant="outline" title={String(txRef)}>
                        tx: <span className="font-mono">{String(txRef)}</span>
                      </Badge>
                    )}
                  </div>

                  {e.notes && <p className="mt-2 text-sm">{e.notes}</p>}

                  <div className="mt-2 text-xs text-muted-foreground">
                    by <span className="font-mono">{e.byDid}</span>
                    {e.assignedToDid && (
                      <>
                        {" "}
                        → <span className="font-mono">{e.assignedToDid}</span>
                      </>
                    )}
                  </div>

                  {showVerify && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(e.id)}
                        disabled={!!verifyingRow}
                      >
                        {verifyingRow
                          ? "Verifico…"
                          : intg === true
                          ? "Integrità: OK"
                          : intg === false
                          ? "Integrità: KO"
                          : "Verifica integrità"}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
