import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "@/utils/constants";

import LoginPage from "@/pages/auth/LoginPage";
import RequireRole from "@/routes/RequireRole";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Dashboards
import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import CompanyDashboard from "@/pages/dashboards/CompanyDashboard";
import CompanyTeamPage from "@/pages/company/CompanyTeamPage";
import CreatorDashboard from "@/pages/dashboards/CreatorDashboard";
import OperatorDashboard from "@/pages/dashboards/OperatorDashboard";
import MachineDashboard from "@/pages/dashboards/MachineDashboard";

// Company
import CompanyEventsPage from "@/pages/events/CompanyEventsPage";
import CompanyAttributesPage from "@/pages/company/CompanyAttributesPage";
import CompanyIslandsPage from "@/pages/company/CompanyIslandsPage";

// Creator
import CreatorEventsPage from "@/pages/events/CreatorEventsPage";
import CreatorProductsPage from "@/pages/products/CreatorProductsPage";
import CreatorAttributesCatalogPage from "@/pages/creator/CreatorAttributesCatalogPage";

// Prodotti (comuni a company/creator)
import ProductsPage from "@/pages/products/ProductsPage";
import ProductDetailPage from "@/pages/products/ProductDetailPage";
import ProductAttributesPage from "@/pages/products/ProductAttributesPage";
import DPPViewerPage from "@/pages/products/DPPViewerPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pubblico */}
        <Route path={ROUTES.login} element={<LoginPage />} />

        {/* Protetto + layout */}
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
          <Route
            path="/company/events"
            element={
              <RequireRole role="company">
                <CompanyEventsPage />
              </RequireRole>
            }
          />
          <Route
            path="/company/attributes"
            element={
              <RequireRole role="company">
                <CompanyAttributesPage />
              </RequireRole>
            }
          />
          <Route
            path="/company/islands"
            element={
              <RequireRole role="company">
                <CompanyIslandsPage />
              </RequireRole>
            }
          />
          <Route
            path="/company/products"
            element={
              <RequireRole role="company">
                <ProductsPage />
              </RequireRole>
            }
          />
          <Route
            path="/company/products/:id"
            element={
              <RequireRole role="company">
                <ProductDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="/company/products/:id/attributes"
            element={
              <RequireRole role="company">
                <ProductAttributesPage />
              </RequireRole>
            }
          />
          <Route
            path="/company/products/:id/dpp"
            element={
              <RequireRole role="company">
                <DPPViewerPage />
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
          <Route
            path="/creator/events"
            element={
              <RequireRole role="creator">
                <CreatorEventsPage />
              </RequireRole>
            }
          />
          <Route
            path="/creator/products"
            element={
              <RequireRole role="creator">
                <CreatorProductsPage />
              </RequireRole>
            }
          />
          <Route
            path="/creator/products/:id"
            element={
              <RequireRole role="creator">
                <ProductDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="/creator/products/:id/attributes"
            element={
              <RequireRole role="creator">
                <ProductAttributesPage />
              </RequireRole>
            }
          />
          <Route
            path="/creator/products/:id/dpp"
            element={
              <RequireRole role="creator">
                <DPPViewerPage />
              </RequireRole>
            }
          />
          <Route
            path="/creator/attributes"
            element={
              <RequireRole role="creator">
                <CreatorAttributesCatalogPage />
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
