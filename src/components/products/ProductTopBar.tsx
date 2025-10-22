import * as React from "react";
import { NavLink } from "react-router-dom";

type Props = { roleBase: string; productId: string };

export default function ProductTopBar({ roleBase, productId }: Props) {
  const base = `${roleBase}/products/${productId}`;
  const items = [
    { to: base, label: "Dettaglio", end: true },
    { to: `${base}/events`, label: "Eventi" },
    { to: `${base}/attributes`, label: "Caratteristiche" },
    { to: `${base}/credentials`, label: "Credenziali" },
    { to: `${base}/dpp`, label: "DPP Viewer" },
  ];

  return (
    <nav className="mb-3 flex flex-wrap gap-1">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={(it as any).end}
          className={({ isActive }) =>
            [
              "px-3 py-2 text-sm rounded-md",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")
          }
        >
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
