import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { NAV } from "@/components/layout/nav-config";

export default function Sidebar() {
  const { currentUser } = useAuth();
  const role = currentUser?.role as keyof typeof NAV | undefined;

  // Voci per il ruolo corrente
  const items = role && NAV[role] ? NAV[role] : [];

  return (
    <aside className="w-64 border-r p-4 space-y-2 bg-background">
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nessuna sezione disponibile.
        </div>
      ) : (
        <nav className="space-y-1">
          {items.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                [
                  "block rounded px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                ].join(" ")
              }
              end
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      )}
    </aside>
  );
}
