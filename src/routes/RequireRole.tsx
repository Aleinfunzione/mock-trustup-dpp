// src/routes/RequireRole.tsx
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

type Role = "admin" | "company" | "creator" | "operator" | "machine";

export default function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useUser();
  const location = useLocation();

  // Non autenticato → login
  if (!user?.role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Ruolo non corrispondente → unauthorized
  if (user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
