import * as React from "react";
import { useEffect, useState, useCallback } from "react";
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

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UIEvent[]>([]);
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [integrity, setIntegrity] = useState<Record<string, boolean | null>>({});

  const cardTitle = title ? title : mode === "assignee" ? "I miei task" : "Eventi del prodotto";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      let data: UIEvent[] = [];
      if (mode === "assignee") {
        if (!effectiveAssignee) {
          setRows([]);
          return;
        }
        data = (await listByAssignee(effectiveAssignee)) as UIEvent[];
      } else {
        if (!productId) {
          setRows([]);
          return;
        }
        data = (await listByProduct(productId)) as UIEvent[];
      }
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRows(data);
      setIntegrity({});
    } catch (err: any) {
      toast({
        title: "Errore nel caricamento eventi",
        description: err?.message ?? "Impossibile leggere gli eventi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [mode, productId, effectiveAssignee, listByAssignee, listByProduct, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async (id: string) => {
    try {
      await updateEventStatus(id, "done");
      toast({ title: "Evento completato", description: `#${id}` });
      onUpdated?.(id);
      await load();
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

  const emptyMessage = mode === "assignee" ? "Non ci sono task assegnati." : "Questo prodotto non ha ancora eventi.";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Caricamento…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Prodotto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Creato</TableHead>
                <TableHead>Assegnato a</TableHead>
                {showIntegrity && <TableHead>Integrità</TableHead>}
                {enableActions && <TableHead className="text-right">Azioni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const statusColor =
                  r.status === "done" ? "bg-emerald-600" : r.status === "in_progress" ? "bg-blue-600" : "bg-amber-600";
                const intg = integrity[r.id];
                const verifyingRow = verifying[r.id];

                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell className="font-mono text-xs">{r.productId}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>
                      <Badge className={statusColor + " text-white"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(r.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.assignedToDid ?? "-"}</TableCell>

                    {showIntegrity && (
                      <TableCell>
                        {intg === undefined ? (
                          <Button variant="secondary" size="sm" disabled={!!verifyingRow} onClick={() => handleVerify(r.id)}>
                            {verifyingRow ? "Verifica…" : "Verifica"}
                          </Button>
                        ) : intg ? (
                          <Badge variant="default">✅ Valida</Badge>
                        ) : (
                          <Badge variant="destructive">❌ Non valida</Badge>
                        )}
                      </TableCell>
                    )}

                    {enableActions && (
                      <TableCell className="text-right">
                        <Button size="sm" disabled={r.status === "done"} onClick={() => handleComplete(r.id)}>
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
