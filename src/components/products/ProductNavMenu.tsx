// src/components/products/ProductNavMenu.tsx
import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";

type Props = { roleBase: string; productId: string };

export default function ProductNavMenu({ roleBase, productId }: Props) {
  const base = `${roleBase}/products/${productId}`;

  const items = React.useMemo(
    () => [
      { to: base, label: "Dettaglio", end: true },
      { to: `${base}/events`, label: "Eventi" },
      { to: `${base}/attributes`, label: "Caratteristiche" },
      { to: `${base}/credentials`, label: "Credenziali" },
      { to: `${base}/dpp`, label: "DPP Viewer" },
    ],
    [base]
  );

  return (
    <NavigationMenu className="mb-2">
      <NavigationMenuList>
        {items.map((it) => (
          <NavigationMenuItem key={it.to}>
            <NavigationMenuLink asChild>
              <NavLink
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
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
