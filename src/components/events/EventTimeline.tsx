import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useEvents } from "@/hooks/useEvents";
import type { UIEvent } from "@/hooks/useEvents";

type Props = {
  productId: string;
  title?: string;
  showVerify?: boolean;
};

export default function EventTimeline({
  productId,
  title = "Timeline eventi",
  showVerify = true,
}: Props) {
  const { toast } = useToast();
  const { listByProduct, verifyEventIntegrity } = useEvents();

  const [rows, setRows] = useState<UIEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [integrity, setIntegrity] = useState<Record<string, boolean | null>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listByProduct(productId);
      // Ordine cronologico crescente (dal più vecchio al più recente)
      data.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setRows(data);
      setIntegrity({});
    } catch (err: any) {
      toast({
        title: "Errore nel caricamento timeline",
        description: err?.message ?? "Impossibile leggere gli eventi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [productId, listByProduct, toast]);

  useEffect(() => {
    load();
  }, [load]);

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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Caricamento…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nessun evento registrato per questo prodotto.
          </div>
        ) : (
          <ol className="relative border-s border-neutral-300 dark:border-neutral-700">
            {rows.map((e) => {
              const statusColor =
                e.status === "done"
                  ? "bg-emerald-600"
                  : e.status === "in_progress"
                  ? "bg-blue-600"
                  : "bg-amber-600";

              const intg = integrity[e.id];
              const verifyingRow = verifying[e.id];

              // --- Nuovo: ambito e target BOM (se presenti in e.data) ---
              const scope = (e as any).data?.scope as "product" | "bom" | undefined;
              const targetLabel = (e as any).data?.targetLabel as string | undefined;

              return (
                <li key={e.id} className="mb-6 ms-6">
                  {/* puntatore timeline */}
                  <span className="absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 ring-8 ring-white dark:ring-neutral-900" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{e.id}</span>
                    <Badge className={statusColor + " text-white"}>{e.status}</Badge>
                    {scope && (
                      <Badge variant="secondary">
                        {scope === "bom" ? `BOM` : `Prodotto`}
                      </Badge>
                    )}
                    {scope === "bom" && targetLabel && (
                      <Badge variant="outline">{targetLabel}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-1">
                    <span className="font-medium">{e.type}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      by {e.byDid} {e.assignedToDid && `→ ${e.assignedToDid}`}
                    </span>
                  </div>

                  {e.notes && <div className="text-sm">{e.notes}</div>}

                  {showVerify && (
                    <div className="mt-2">
                      {intg === undefined ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!!verifyingRow}
                          onClick={() => handleVerify(e.id)}
                        >
                          {verifyingRow ? "Verifica…" : "Verifica integrità"}
                        </Button>
                      ) : intg ? (
                        <Badge variant="default">✅ Firma/Hash OK</Badge>
                      ) : (
                        <Badge variant="destructive">❌ Non valida</Badge>
                      )}
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
