// src/components/layout/Sidebar.tsx
import { NavLink, useLocation } from "react-router-dom";
import * as React from "react";
import { useAuth } from "@/hooks/useAuth";

type NavItem = { to: string; label: string; children?: NavItem[] };

const NAV: Record<string, NavItem[]> = {
  admin: [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/credits", label: "Crediti" },
  ],
  company: [
    { to: "/company", label: "Dashboard" },
    { to: "/company/products", label: "Prodotti" },
    { to: "/company/events", label: "Eventi" },
    { to: "/company/org", label: "Organizzazione" },
    { to: "/company/attributes", label: "Attributi azienda" },
    { to: "/company/compliance", label: "Compliance" },
    { to: "/company/credentials", label: "Credenziali org" },
    { to: "/company/credits", label: "Crediti" },
    { to: "/company/credits/history", label: "Storico crediti" }, // NEW
  ],
  creator: [
    { to: "/creator", label: "Dashboard" },
    { to: "/creator/products", label: "Prodotti" },
    {
      to: "/creator/events",
      label: "Eventi",
      children: [
        { to: "/creator/events", label: "KPI" },
        { to: "/creator/events/create", label: "Registra evento" },
        { to: "/creator/events/timeline", label: "Timeline" },
      ],
    },
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

  const [open, setOpen] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const it of items) {
      if (it.children?.length) {
        next[it.to] = pathname === it.to || pathname.startsWith(it.to + "/");
      }
    }
    setOpen((s) => ({ ...s, ...next }));
  }, [pathname, role, items]);

  const toggle = (key: string) => setOpen((s) => ({ ...s, [key]: !s[key] }));
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <nav className="p-3 space-y-1">
      {items.map((i) => {
        const active = isActive(i.to);
        if (!i.children?.length) {
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
        }
        const openGroup = !!open[i.to];
        return (
          <div key={i.to} className="space-y-1">
            <button
              type="button"
              onClick={() => toggle(i.to)}
              className={
                "w-full text-left rounded-xl px-3 py-2 text-sm transition " +
                (active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground")
              }
              aria-expanded={openGroup}
              aria-controls={`group-${i.to}`}
            >
              <span className="inline-flex items-center gap-2">
                <span className={"transition-transform " + (openGroup ? "rotate-90" : "")}>▸</span>
                {i.label}
              </span>
            </button>
            {openGroup && (
              <div id={`group-${i.to}`} className="ml-5 space-y-1">
                {i.children.map((c) => {
                  const childActive = isActive(c.to);
                  return (
                    <NavLink
                      key={c.to}
                      to={c.to}
                      className={
                        "block rounded-lg px-3 py-1.5 text-sm " +
                        (childActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground")
                      }
                    >
                      {c.label}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
