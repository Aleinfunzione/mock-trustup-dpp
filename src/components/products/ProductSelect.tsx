import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { getActor } from "@/services/api/identity";
import { listProductsByCompany } from "@/services/api/products";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/types/product";

type Props = {
  value?: string;
  onChange?: (productId: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  autoSelectFirst?: boolean;
  className?: string;
};

export default function ProductSelect({
  value,
  onChange,
  label = "Prodotto",
  placeholder = "Seleziona un prodotto",
  disabled,
  autoSelectFirst = false,
  className,
}: Props) {
  const { currentUser } = useAuth();
  const actor = currentUser?.did ? getActor(currentUser.did) : undefined;
  const companyDid = currentUser?.companyDid ?? actor?.companyDid;

  const { listMine } = useProducts();
  const [items, setItems] = React.useState<Product[]>([]);

  React.useEffect(() => {
    let list: Product[] = [];
    if (companyDid) {
      list = (listProductsByCompany(companyDid) as Product[]) ?? [];
    } else if (typeof listMine === "function") {
      list = ((listMine() as unknown) as Product[]) ?? [];
    }

    // ordina per updatedAt desc se presente
    list = [...list].sort(
      (a: any, b: any) => (b?.updatedAt ?? "").localeCompare(a?.updatedAt ?? "")
    );

    setItems(list);

    if (autoSelectFirst && !value && list[0]) {
      onChange?.(list[0].id);
    }
    // vogliamo che cambi solo quando cambia l'azienda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyDid]);

  return (
    <div className={className}>
      {label && (
        <label htmlFor="product-select" className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}

      <select
        id="product-select"
        className="w-full h-9 rounded-md border bg-background px-3 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        aria-label={label}
      >
        <option value="" disabled>
          {placeholder}
        </option>

        {items.length === 0 ? (
          <option value="" disabled>
            — Nessun prodotto —
          </option>
        ) : (
          items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.sku ? `• ${p.sku}` : ""} — {p.id}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
