// src/components/events/TelemetryViewer.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type TelemetryRecord = {
  ts: string | number | Date;
  value: Record<string, any>;
};

type TelemetryViewerProps = {
  telemetry: TelemetryRecord[];
};

export default function TelemetryViewer({ telemetry }: TelemetryViewerProps) {
  if (!telemetry || telemetry.length === 0) {
    return <div className="text-sm text-muted-foreground">Nessuna telemetria disponibile.</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Telemetria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {telemetry.map((t, i) => (
          <div key={i} className="border rounded-md p-2 text-xs font-mono bg-muted">
            <div className="text-muted-foreground">
              {new Date(t.ts).toLocaleString()}
            </div>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(t.value, null, 2)}
            </pre>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
