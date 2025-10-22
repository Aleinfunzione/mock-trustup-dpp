// src/components/products/GuidedAttributesSection.tsx
import * as React from "react";
import type { ProductType } from "@/types/productType";
import { listProductTypes } from "@/services/api/products";
import SchemaAttributesForm from "@/components/products/SchemaAttributesForm";

type Props = {
  typeId: string;
  onTypeIdChange: (next: string) => void;
  value: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
};

export default function GuidedAttributesSection({ typeId, onTypeIdChange, value, onChange }: Props) {
  const [types, setTypes] = React.useState<ProductType[]>([]);
  const [current, setCurrent] = React.useState<ProductType | null>(null);

  React.useEffect(() => {
    const all = listProductTypes();
    setTypes(all);
    setCurrent(all.find((t) => t.id === typeId) || all[0] || null);
  }, []);

  React.useEffect(() => {
    const all = listProductTypes();
    const t = all.find((x) => x.id === typeId) || null;
    setCurrent(t);
    // opzionale: reset se cambia tipo
    // onChange({});
  }, [typeId]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Tipo</div>
          <select
            className="w-full h-9 rounded border bg-background"
            value={typeId}
            onChange={(e) => onTypeIdChange(e.target.value)}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.id})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Schema (solo info)</div>
          <pre className="text-[11px] p-2 rounded border overflow-auto bg-muted/30 h-24">
{JSON.stringify(current?.schema ?? {}, null, 1)}
          </pre>
        </div>
      </div>

      <div className="text-sm font-medium">Attributi guidati</div>
      <SchemaAttributesForm schema={current?.schema} value={value} onChange={onChange} />
    </div>
  );
}
