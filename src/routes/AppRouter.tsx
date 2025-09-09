// src/routes/AppRouter.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";

// Layouts (li creeremo/abbiamo già nel progetto)
import MinimalLayout from "@/components/layout/MinimalLayout";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Route guard
import RequireRole from "./RequireRole";

// Pagine auth (le genereremo subito dopo)
import LoginPage from "@/pages/auth/LoginPage";
import LogoutPage from "@/pages/auth/LogoutPage";

// Dashboard per ruolo (se non esistono ancora: verranno create a breve)
import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import CompanyDashboard from "@/pages/dashboards/CompanyDashboard";
import CreatorDashboard from "@/pages/dashboards/CreatorDashboard";
import OperatorDashboard from "@/pages/dashboards/OperatorDashboard";
import MachineDashboard from "@/pages/dashboards/MachineDashboard";

// Hook utente (verrà fornito dal UserContext)
import { useUser } from "@/contexts/UserContext";

function DefaultRedirect() {
  const { user } = useUser(); // user?.role: 'admin' | 'company' | 'creator' | 'operator' | 'machine' | undefined

  if (!user?.role) {
    return <Navigate to="/login" replace />;
  }
  const role = user.role;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "company") return <Navigate to="/company" replace />;
  if (role === "creator") return <Navigate to="/creator" replace />;
  if (role === "operator") return <Navigate to="/operator" replace />;
  return <Navigate to="/machine" replace />;
}

function UnauthorizedPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Accesso non autorizzato</h1>
        <p className="text-muted-foreground">
          Non hai i permessi per visualizzare questa pagina.
        </p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Pagina non trovata</h1>
        <p className="text-muted-foreground">Controlla l’indirizzo o usa il menu.</p>
      </div>
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-6">Caricamento…</div>}>
        <Routes>
          {/* Public / Auth layout */}
          <Route element={<MinimalLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/logout" element={<LogoutPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Route>

          {/* App (protetta) */}
          <Route element={<DashboardLayout />}>
            <Route
              path="/admin"
              element={
                <RequireRole role="admin">
                  <AdminDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/company"
              element={
                <RequireRole role="company">
                  <CompanyDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/creator"
              element={
                <RequireRole role="creator">
                  <CreatorDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/operator"
              element={
                <RequireRole role="operator">
                  <OperatorDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/machine"
              element={
                <RequireRole role="machine">
                  <MachineDashboard />
                </RequireRole>
              }
            />
          </Route>

          {/* Root: decide in base al ruolo utente */}
          <Route path="/" element={<DefaultRedirect />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
