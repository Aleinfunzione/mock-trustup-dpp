import { NavLink } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

type Item = { to: string; label: string; roles: Array<"admin"|"company"|"creator"|"operator"|"machine"> };

const items: Item[] = [
  { to: "/admin",   label: "Admin",      roles: ["admin"] },
  { to: "/company", label: "Azienda",    roles: ["company", "admin"] },
  { to: "/creator", label: "Creator",    roles: ["creator", "admin"] },
  { to: "/operator",label: "Operatore",  roles: ["operator", "admin"] },
  { to: "/machine", label: "Macchinario",roles: ["machine", "admin"] },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 h-full w-72 border-r border-zinc-800 bg-[#0F1526] text-zinc-100">
      <div className="px-5 py-4 text-lg font-semibold">TRUSTUP • MOCK</div>

      <nav className="mt-2 space-y-1 px-3">
        {user
          ? items
              .filter(i => i.roles.includes(user.role))
              .map(i => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm ${
                      isActive ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                    }`
                  }
                >
                  {i.label}
                </NavLink>
              ))
          : (
            <div className="text-xs text-zinc-400 px-3">Accedi per vedere il menu</div>
          )
        }
      </nav>

      <div className="absolute bottom-0 w-full px-4 py-3 text-xs text-zinc-400">
        {user ? (
          <>
            <div className="font-medium text-zinc-100">{user.name ?? user.did}</div>
            <div>role: <b>{user.role}</b></div>
            <button
              onClick={logout}
              className="mt-2 text-left text-zinc-300 hover:underline"
            >
              Esci
            </button>
          </>
        ) : (
          <div>non autenticato</div>
        )}
      </div>
    </aside>
  );
}
