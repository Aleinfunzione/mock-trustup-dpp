import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

type Role = "admin" | "company" | "creator" | "operator" | "machine";

export default function RequireRole({
  allow,
  children,
}: {
  allow: Role[];
  children: JSX.Element;
}) {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!allow.includes(user.role)) {
    const fallback =
      user.role === "admin"
        ? "/admin"
        : user.role === "company"
        ? "/company"
        : user.role === "creator"
        ? "/creator"
        : user.role === "operator"
        ? "/operator"
        : "/machine";
    return <Navigate to={fallback} replace />;
  }
  return children;
}
