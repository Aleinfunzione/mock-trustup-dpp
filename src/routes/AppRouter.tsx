import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "@/utils/constants";

import LoginPage from "@/pages/auth/LoginPage";
import RequireRole from "@/routes/RequireRole";
import DashboardLayout from "@/components/layout/DashboardLayout";

import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import CompanyDashboard from "@/pages/dashboards/CompanyDashboard";   // Home azienda
import CompanyTeamPage from "@/pages/company/CompanyTeamPage";        // Team (membri)
import CreatorDashboard from "@/pages/dashboards/CreatorDashboard";
import OperatorDashboard from "@/pages/dashboards/OperatorDashboard";
import MachineDashboard from "@/pages/dashboards/MachineDashboard";

// Prodotti
import ProductsPage from "@/pages/products/ProductsPage";             // Lista prodotti (Company)
import CreatorProductsPage from "@/pages/products/CreatorProductsPage"; // Lista prodotti (Creator)
import ProductDetailPage from "@/pages/products/ProductDetailPage";   // Dettaglio + timeline eventi

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login pubblico */}
        <Route path={ROUTES.login} element={<LoginPage />} />

        {/* Sezione protetta + layout comune */}
        <Route element={<DashboardLayout />}>
          {/* Admin */}
          <Route
            path={ROUTES.admin}
            element={
              <RequireRole role="admin">
                <AdminDashboard />
              </RequireRole>
            }
          />

          {/* Company */}
          <Route
            path={ROUTES.company}
            element={
              <RequireRole role="company">
                <CompanyDashboard />
              </RequireRole>
            }
          />
          <Route
            path={ROUTES.companyTeam}
            element={
              <RequireRole role="company">
                <CompanyTeamPage />
              </RequireRole>
            }
          />
          {/* Lista prodotti (Company) */}
          <Route
            path="/company/products"
            element={
              <RequireRole role="company">
                <ProductsPage />
              </RequireRole>
            }
          />
          {/* Dettaglio prodotto (Company) */}
          <Route
            path="/company/products/:id"
            element={
              <RequireRole role="company">
                <ProductDetailPage />
              </RequireRole>
            }
          />

          {/* Creator */}
          <Route
            path={ROUTES.creator}
            element={
              <RequireRole role="creator">
                <CreatorDashboard />
              </RequireRole>
            }
          />
          {/* Lista prodotti (Creator) */}
          <Route
            path="/creator/products"
            element={
              <RequireRole role="creator">
                <CreatorProductsPage />
              </RequireRole>
            }
          />
          {/* Dettaglio prodotto (Creator) */}
          <Route
            path="/creator/products/:id"
            element={
              <RequireRole role="creator">
                <ProductDetailPage />
              </RequireRole>
            }
          />

          {/* Operator */}
          <Route
            path={ROUTES.operator}
            element={
              <RequireRole role="operator">
                <OperatorDashboard />
              </RequireRole>
            }
          />

          {/* Machine */}
          <Route
            path={ROUTES.machine}
            element={
              <RequireRole role="machine">
                <MachineDashboard />
              </RequireRole>
            }
          />
        </Route>

        {/* Redirect di default */}
        <Route path="/" element={<Navigate to={ROUTES.login} replace />} />
        <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
