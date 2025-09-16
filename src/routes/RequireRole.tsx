import type { Role } from "@/types/auth"
import { useAuth } from "@/hooks/useAuth"
import { Navigate } from "react-router-dom"
import { ROUTES } from "@/utils/constants"

export default function RequireRole({
  role,
  children,
}: {
  role: Role
  children: React.ReactNode
}) {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to={ROUTES.login} replace />
  if (currentUser.role !== role) return <Navigate to={ROUTES.login} replace />
  return <>{children}</>
}
