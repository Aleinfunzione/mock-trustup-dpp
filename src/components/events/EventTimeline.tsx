import * as React from "react";
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

  const [rows, setRows] = React.useState<UIEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [verifying, setVerifying] = React.useState<Record<string, boolean>>({});
  const [integrity, setIntegrity] = React.useState<Record<string, boolean | null>>({});

  // ⚠️ Effetto dipende SOLO da productId (le funzioni del hook non sono incluse)
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
  }, [productId]); // ← niente listByProduct/toast qui

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

              const scope = (e as any).data?.scope as "product" | "bom" | undefined;
              const targetLabel = (e as any).data?.targetLabel as string | undefined;

              return (
                <li key={e.id} className="mb-10 ms-6">
                  <span className="absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-8 ring-background">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
                  </span>

                  <div className="flex items-center gap-2">
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
                  </div>

                  {e.notes && <p className="mt-2 text-sm">{e.notes}</p>}

                  <div className="mt-2 text-xs text-muted-foreground">
                    by {e.byDid} {e.assignedToDid && `→ ${e.assignedToDid}`}
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
