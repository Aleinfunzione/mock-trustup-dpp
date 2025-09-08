import { Navigate } from "react-router-dom";
import { useAuth } from "@/stores/authStore";

export default function RequireRole({ role, children }: { role: string; children: JSX.Element }) {
  const u = useAuth((s) => s.currentUser);
  if (!u) return <Navigate to="/login" replace />;
  if (u.role !== role) return <Navigate to={`/${u.role}`} replace />;
  return children;
}
