import * as React from "react";
import { NavLink } from "react-router-dom";

type Props = {
  roleBase: string;
  productId: string;
  /** se presente abilita "Snapshot" → /dpp/:snapshotId */
  snapshotId?: string;
};

export default function ProductTopBar({ roleBase, productId, snapshotId }: Props) {
  const base = `${roleBase}/products/${productId}`;
  const items: Array<{ to?: string; label: string; end?: boolean; disabled?: boolean }> = [
    { to: base, label: "Descrizione", end: true },
    { to: `${base}/events`, label: "Eventi" },
    { to: `${base}/attributes`, label: "Caratteristiche" },
    { to: `${base}/dpp`, label: "DPP Viewer" },
    { to: snapshotId ? `${base}/dpp/${snapshotId}` : undefined, label: "Snapshot", disabled: !snapshotId },
  ];

  return (
    <nav className="mb-3 flex flex-wrap gap-1">
      {items.map((it) =>
        it.to && !it.disabled ? (
          <NavLink
            key={it.label}
            to={it.to}
            end={it.end as any}
            className={({ isActive }) =>
              [
                "px-3 py-2 text-sm rounded-md",
                isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              ].join(" ")
            }
          >
            {it.label}
          </NavLink>
        ) : (
          <span
            key={it.label}
            className="px-3 py-2 text-sm rounded-md text-muted-foreground/70 cursor-not-allowed select-none"
            aria-disabled="true"
          >
            {it.label}
          </span>
        )
      )}
    </nav>
  );
}
