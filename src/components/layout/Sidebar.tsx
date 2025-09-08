import React from "react";
import { NavLink } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="fixed left-0 top-16 w-72 h-[calc(100vh-4rem)] border-r bg-background p-4 overflow-y-auto">
      <nav className="space-y-1">
        {user?.role === "admin" && (
          <>
            <NavLink to="/admin" className="block px-3 py-2 rounded-lg hover:bg-muted">Dashboard</NavLink>
            <NavLink to="/admin/companies" className={({ isActive }) =>
              `block px-3 py-2 rounded-lg hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`
            }>Aziende <Badge className="ml-2">Admin</Badge></NavLink>
          </>
        )}
        {user?.role === "company" && (
          <>
            <NavLink to="/company" className="block px-3 py-2 rounded-lg hover:bg-muted">Dashboard</NavLink>
            <NavLink to="/company/team" className={({ isActive }) =>
              `block px-3 py-2 rounded-lg hover:bg-muted ${isActive ? 'bg-muted font-medium' : ''}`
            }>Team</NavLink>
          </>
        )}
        {user?.role === "creator" && (
          <NavLink to="/creator" className="block px-3 py-2 rounded-lg hover:bg-muted">Dashboard</NavLink>
        )}
        {user?.role === "operator" && (
          <NavLink to="/operator" className="block px-3 py-2 rounded-lg hover:bg-muted">Dashboard</NavLink>
        )}
        {user?.role === "machine" && (
          <NavLink to="/machine" className="block px-3 py-2 rounded-lg hover:bg-muted">Dashboard</NavLink>
        )}
      </nav>
    </aside>
  );
}
