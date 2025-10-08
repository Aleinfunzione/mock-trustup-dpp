// src/components/layout/Sidebar.tsx
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

type NavItem = { to: string; label: string };
const NAV: Record<string, NavItem[]> = {
  admin: [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/credits", label: "Crediti" }, // NEW
  ],
  company: [
    { to: "/company", label: "Dashboard" },
    { to: "/company/products", label: "Prodotti" },
    { to: "/company/events", label: "Eventi" },
    { to: "/company/org", label: "Organizzazione" }, // NEW (Team+Isole)
    { to: "/company/attributes", label: "Attributi azienda" },
    { to: "/company/compliance", label: "Compliance" },
    { to: "/company/credentials", label: "Credenziali org" },
    { to: "/company/credits", label: "Crediti" }, // NEW
  ],
  creator: [
    { to: "/creator", label: "Dashboard" },
    { to: "/creator/products", label: "Prodotti" },
    { to: "/creator/events", label: "Eventi" },
    { to: "/creator/attributes", label: "Catalogo attributi" },
  ],
  operator: [{ to: "/operator", label: "Dashboard" }],
  machine: [{ to: "/machine", label: "Dashboard" }],
};

export default function Sidebar() {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const role = currentUser?.role ?? "creator";
  const items = NAV[role] ?? [];
  return (
    <nav className="p-3 space-y-1">
      {items.map((i) => {
        const active = pathname === i.to || pathname.startsWith(i.to + "/");
        return (
          <NavLink
            key={i.to}
            to={i.to}
            className={
              "block rounded-xl px-3 py-2 text-sm " +
              (active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground")
            }
          >
            {i.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
