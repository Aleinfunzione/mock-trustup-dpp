// /src/components/attributes/PillItem.tsx
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PillInstance } from "@/config/attributeCatalog";

export type PillItemProps = {
  pill: PillInstance;
  onEdit: (pillId: string) => void;
  onRemove: (pillId: string) => void;
};

export default function PillItem({ pill, onEdit, onRemove }: PillItemProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="truncate">{pill.catalogId}</span>
          <Badge variant="secondary">{pill.namespace}</Badge>
          <Badge variant="outline">v{pill.version}</Badge>
          {!!pill.errors?.length && (
            <Badge variant="destructive">{pill.errors.length} errori</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground flex flex-wrap gap-3 items-center">
          <div>Creato: {new Date(pill.createdAt).toLocaleString()}</div>
          {pill.updatedAt && <div>Ultimo update: {new Date(pill.updatedAt).toLocaleString()}</div>}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(pill.id)}>
            Modifica
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onRemove(pill.id)}>
            Rimuovi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
