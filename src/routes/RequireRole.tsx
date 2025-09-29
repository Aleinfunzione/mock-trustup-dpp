import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/utils/constants";

type Props = {
  role: "admin" | "company" | "creator" | "operator" | "machine";
  children: React.ReactNode;
};

export default function RequireRole({ role, children }: Props) {
  const { currentUser } = useAuth();

  if (!currentUser) return <Navigate to={ROUTES.login} replace />;
  if (currentUser.role !== role) {
    const target = `/${currentUser.role}` as const;
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}
