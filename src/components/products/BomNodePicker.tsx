import * as React from "react";
import { getProductById } from "@/services/api/products";
import type { BomNode } from "@/types/product";

type Props = {
  productId: string;
  value?: string;
  onChange?: (nodeId: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

type Option = { id: string; label: string; path: string[]; isGroup: boolean };

export default function BomNodePicker({
  productId,
  value,
  onChange,
  label = "Nodo BOM",
  placeholder = "Seleziona un nodo",
  disabled,
  className,
}: Props) {
  const [options, setOptions] = React.useState<Option[]>([]);

  React.useEffect(() => {
    const prod = getProductById(productId) as any;
    const bom: BomNode[] = prod?.bom || [];
    setOptions(flattenBOM(bom));
  }, [productId]);

  return (
    <div className={className}>
      {label && (
        <label htmlFor="bom-node" className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}

      <select
        id="bom-node"
        className="w-full h-9 rounded-md border bg-background px-3 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || options.length === 0}
        aria-label={label}
      >
        <option value="" disabled>
          {placeholder}
        </option>

        {options.length === 0 ? (
          <option value="" disabled>
            — Nessuna BOM disponibile —
          </option>
        ) : (
          options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

function flattenBOM(nodes: BomNode[], path: string[] = [], depth = 0): Option[] {
  const out: Option[] = [];
  for (const n of nodes) {
    const indent = "— ".repeat(depth);
    const labelBase = (n as any).label ?? (n as any).name ?? n.id;
    const thisPath = [...path, n.id];

    out.push({
      id: n.id,
      label: `${indent}${labelBase}${n.children?.length ? " (gruppo)" : ""}`,
      path: thisPath,
      isGroup: !!(n.children && n.children.length),
    });

    if (n.children?.length) out.push(...flattenBOM(n.children, thisPath, depth + 1));
  }
  return out;
}
