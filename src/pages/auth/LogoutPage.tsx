import { useEffect } from "react";
import { useAuth } from "@/stores/authStore";
import { Navigate } from "react-router-dom";

export default function LogoutPage() {
  const logout = useAuth((s) => s.logout);
  useEffect(() => { logout(); }, [logout]);
  return <Navigate to="/login" replace />;
}
