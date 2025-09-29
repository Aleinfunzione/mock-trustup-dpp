import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { useEvents } from "@/hooks/useEvents";
import type { UIEvent } from "@/hooks/useEvents";

type Mode = "assignee" | "product";

type EventListProps = {
  mode: Mode;
  productId?: string;
  assigneeDid?: string;
  enableActions?: boolean;
  showIntegrity?: boolean;
  title?: string;
  onUpdated?: (eventId: string) => void;
};

export default function EventList({
  mode,
  productId,
  assigneeDid,
  enableActions = true,
  showIntegrity = true,
  title,
  onUpdated,
}: EventListProps) {
  const { toast } = useToast();
  const { currentUser } = useAuthStore();
  const { listByAssignee, listByProduct, updateEventStatus, verifyEventIntegrity } = useEvents();

  const effectiveAssignee = assigneeDid ?? currentUser?.did;

  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<UIEvent[]>([]);
  const [verifying, setVerifying] = React.useState<Record<string, boolean>>({});
  const [integrity, setIntegrity] = React.useState<Record<string, boolean | null>>({});

  const cardTitle = title ? title : mode === "assignee" ? "I miei task" : "Eventi del prodotto";

  // ⚠️ Effetto dipende SOLO da parametri stabili (mode/productId/effectiveAssignee)
  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        let data: UIEvent[] = [];
        if (mode === "assignee") {
          if (!effectiveAssignee) {
            if (mounted) setRows([]);
            return;
          }
          data = (await listByAssignee(effectiveAssignee)) as UIEvent[];
        } else {
          if (!productId) {
            if (mounted) setRows([]);
            return;
          }
          data = (await listByProduct(productId)) as UIEvent[];
        }
        if (!mounted) return;
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRows(data);
        setIntegrity({});
      } catch (err: any) {
        if (!mounted) return;
        toast({
          title: "Errore nel caricamento eventi",
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
  }, [mode, productId, effectiveAssignee]); // ← niente funzioni del hook/toast qui

  const handleComplete = async (id: string) => {
    try {
      await updateEventStatus(id, "done");
      toast({ title: "Evento completato", description: `#${id}` });
      onUpdated?.(id);
      // ricarico localmente
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "done", updatedAt: new Date().toISOString() } : r))
      );
    } catch (err: any) {
      toast({
        title: "Impossibile aggiornare lo stato",
        description: err?.message ?? "Verifica permessi/assegnazione.",
        variant: "destructive",
      });
    }
  };

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
        <CardTitle>{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="relative z-0 overflow-x-auto">
        {loading ? (
          <div className="text-sm text-muted-foreground">Caricamento…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nessun evento trovato.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Prodotto</TableHead>
                <TableHead>Stato</TableHead>
                {showIntegrity && <TableHead>Integrità</TableHead>}
                {enableActions && <TableHead className="text-right">Azioni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => {
                const statusColor =
                  e.status === "done"
                    ? "bg-emerald-600"
                    : e.status === "in_progress"
                    ? "bg-blue-600"
                    : "bg-amber-600";

                const intg = integrity[e.id];
                const verifyingRow = verifying[e.id];

                return (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{e.type}</TableCell>
                    <TableCell className="font-mono text-xs">{e.productId}</TableCell>
                    <TableCell>
                      <Badge className={statusColor + " text-white"}>{e.status}</Badge>
                    </TableCell>
                    {showIntegrity && (
                      <TableCell>
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
                            : "Verifica"}
                        </Button>
                      </TableCell>
                    )}
                    {enableActions && (
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleComplete(e.id)}>
                          Completa
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
