// /src/components/attributes/PillList.tsx
import * as React from "react";
import PillItem from "./PillItem";
import type { PillInstance } from "@/config/attributeCatalog";

export type PillListProps = {
  pills: PillInstance[];
  onEdit: (pillId: string) => void;
  onRemove: (pillId: string) => void;
};

export default function PillList({ pills, onEdit, onRemove }: PillListProps) {
  if (!pills || pills.length === 0) {
    return <div className="text-sm text-muted-foreground">Nessuna pillola ancora. Aggiungi dal Catalogo.</div>;
  }

  return (
    <div className="grid gap-3">
      {pills.map((p) => (
        <PillItem key={p.id} pill={p} onEdit={onEdit} onRemove={onRemove} />
      ))}
    </div>
  );
}
