// src/components/events/EventCard.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UIEvent } from "@/hooks/useEvents";
import TelemetryViewer from "@/components/events/TelemetryViewer";
import MachineAutocomplete from "@/components/events/MachineAutocomplete";

type EventCardProps = {
  event: UIEvent;
  onAfterAction?: () => void; // opzionale: refresh dopo addebiti/azioni
};

export default function EventCard({ event, onAfterAction }: EventCardProps) {
  const statusColor =
    event.status === "done"
      ? "bg-emerald-600"
      : event.status === "in_progress"
      ? "bg-blue-600"
      : "bg-amber-600";

  const islandId =
    // priorità al dato strutturato dell'evento
    (event as any)?.data?.islandId ||
    (event as any)?.islandId ||
    undefined;

  const hasTelemetry =
    Array.isArray((event as any)?.data?.telemetry) &&
    (event as any).data.telemetry.length > 0;

  const canMachineAutocomplete =
    !!event.assignedToDid && event.status !== "done";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-sm">
          <span>{event.type}</span>
          <Badge className={statusColor + " text-white"}>{event.status}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div>
          <span className="text-muted-foreground">Evento:</span>{" "}
          <span className="font-mono">{event.id}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Prodotto:</span>{" "}
          <span className="font-mono">{event.productId}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Creato:</span>{" "}
          {new Date(event.createdAt).toLocaleString()}
        </div>
        {islandId && (
          <div>
            <span className="text-muted-foreground">Isola:</span>{" "}
            <span className="font-mono">{String(islandId)}</span>
          </div>
        )}
        {event.notes && (
          <div>
            <span className="text-muted-foreground">Note:</span> {event.notes}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          by <span className="font-mono">{event.byDid}</span>
          {event.assignedToDid ? (
            <>
              {" "}
              → <span className="font-mono">{event.assignedToDid}</span>
            </>
          ) : null}
        </div>

        {hasTelemetry && (
          <TelemetryViewer
            telemetry={(event as any).data.telemetry}
            productId={event.productId}
            eventId={event.id}
            islandId={islandId}
            compact
          />
        )}

        {canMachineAutocomplete && (
          <div className="pt-1">
            <MachineAutocomplete
              eventId={event.id}
              productId={event.productId}
              islandId={islandId}
              count={1}
              compact
              onDone={onAfterAction}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
