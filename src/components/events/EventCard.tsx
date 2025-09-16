import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UIEvent } from "@/hooks/useEvents";

type EventCardProps = { event: UIEvent };

export default function EventCard({ event }: EventCardProps) {
  const statusColor =
    event.status === "done" ? "bg-emerald-600" : event.status === "in_progress" ? "bg-blue-600" : "bg-amber-600";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-sm">
          <span>{event.type}</span>
          <Badge className={statusColor + " text-white"}>{event.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Prodotto:</span>{" "}
          <span className="font-mono">{event.productId}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Creato:</span>{" "}
          {new Date(event.createdAt).toLocaleString()}
        </div>
        {event.notes && (
          <div>
            <span className="text-muted-foreground">Note:</span> {event.notes}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          by {event.byDid} {event.assignedToDid && `→ ${event.assignedToDid}`}
        </div>
      </CardContent>
    </Card>
  );
}
