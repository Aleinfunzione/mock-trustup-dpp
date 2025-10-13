// src/routes/RequireRole.tsx
import * as React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/utils/constants";
import { useToast } from "@/components/ui/use-toast";

type Props = {
  role: "admin" | "company" | "creator" | "operator" | "machine";
  children: React.ReactNode;
};

const BASE_BY_ROLE: Record<Props["role"], string> = {
  admin: ROUTES.admin,
  company: ROUTES.company,
  creator: ROUTES.creator,
  operator: ROUTES.operator,
  machine: ROUTES.machine,
};

export default function RequireRole({ role, children }: Props) {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!currentUser) {
      toast({ title: "Sessione richiesta", description: "Accedi per continuare." });
      return;
    }
    if (currentUser.role !== role) {
      toast({
        title: "Accesso negato",
        description: `Sezione riservata al ruolo: ${role}.`,
        variant: "destructive",
      });
    }
  }, [currentUser, role, toast]);

  if (!currentUser) return <Navigate to={ROUTES.login} replace />;
  if (currentUser.role !== role) {
    const target = BASE_BY_ROLE[currentUser.role] ?? ROUTES.login;
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}
