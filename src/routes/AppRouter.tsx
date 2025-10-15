// src/routes/AppRouter.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "@/utils/constants";

import LoginPage from "@/pages/auth/LoginPage";
import RequireRole from "@/routes/RequireRole";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Dashboards
import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import CompanyDashboard from "@/pages/dashboards/CompanyDashboard";
import CreatorDashboard from "@/pages/dashboards/CreatorDashboard";
import OperatorDashboard from "@/pages/dashboards/OperatorDashboard";
import MachineDashboard from "@/pages/dashboards/MachineDashboard";

// Company
import CompanyEventsPage from "@/pages/events/CompanyEventsPage";
import CompanyAttributesPage from "@/pages/company/CompanyAttributesPage";
import CompanyCompliancePage from "@/pages/company/CompanyCompliancePage";
import OrganizationCredentialPage from "@/pages/company/OrganizationCredentialPage";
import CompanyCreditsPage from "@/pages/company/CompanyCreditsPage";
import CompanyOrganizationPage from "@/pages/company/CompanyOrganizationPage";
import CreditsHistoryPage from "@/pages/company/CreditsHistoryPage";

// Admin
import AdminCreditsPage from "@/pages/admin/AdminCreditsPage";
import AdminCreditsHistoryPage from "@/pages/admin/CreditsHistoryPage";

// Creator
import CreatorEventsKPI from "@/pages/creator/events";
import CreatorEventsTimeline from "@/pages/creator/events/timeline";
import CreatorEventCreatePage from "@/pages/creator/events/create";
import CreatorProductsPage from "@/pages/products/CreatorProductsPage";
import CreatorAttributesCatalogPage from "@/pages/creator/CreatorAttributesCatalogPage";
import CreatorCreditsHistoryPage from "@/pages/creator/CreditsHistoryPage";

// Prodotti
import ProductsPage from "@/pages/products/ProductsPage";
import ProductDetailPage from "@/pages/products/ProductDetailPage";
import ProductAttributesPage from "@/pages/products/ProductAttributesPage";
import ProductCredentialsPage from "@/pages/products/ProductCredentialsPage";
import DPPViewerPage from "@/components/credentials/DPPViewerPage";

// Viewer VP
import VPViewerPage from "@/pages/viewer/VPViewerPage";

// Dev QA
import DevQaPage from "@/pages/dev/DevQaPage";

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
          <Route
            path="/admin/credits"
            element={
              <RequireRole role="admin">
                <AdminCreditsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/credits/history"
            element={
              <RequireRole role="admin">
                <AdminCreditsHistoryPage />
              </RequireRole>
            }
          />
          {/* Dev tools (solo admin) */}
          <Route
            path="/dev"
            element={
              <RequireRole role="admin">
                <DevQaPage />
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
            path="/company/compliance"
            element={
              <RequireRole role="company">
                <CompanyCompliancePage />
              </RequireRole>
            }
          />
          <Route
            path="/company/org"
            element={
              <RequireRole role="company">
                <CompanyOrganizationPage />
              </RequireRole>
            }
          />
          <Route path="/company/team" element={<Navigate to="/company/org?tab=team" replace />} />
          <Route path="/company/islands" element={<Navigate to="/company/org?tab=islands" replace />} />

          <Route
            path="/company/credentials"
            element={
              <RequireRole role="company">
                <OrganizationCredentialPage />
              </RequireRole>
            }
          />
          <Route
            path="/company/credits"
            element={
              <RequireRole role="company">
                <CompanyCreditsPage />
              </RequireRole>
            }
          />
          <Route
            path="/company/credits/history"
            element={
              <RequireRole role="company">
                <CreditsHistoryPage />
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
                <CreatorEventsKPI />
              </RequireRole>
            }
          />
          <Route
            path="/creator/events/create"
            element={
              <RequireRole role="creator">
                <CreatorEventCreatePage />
              </RequireRole>
            }
          />
          <Route
            path="/creator/events/timeline"
            element={
              <RequireRole role="creator">
                <CreatorEventsTimeline />
              </RequireRole>
            }
          />
          <Route
            path="/creator/credits/history"
            element={
              <RequireRole role="creator">
                <CreatorCreditsHistoryPage />
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
            path="/creator/products/:id/credentials"
            element={
              <RequireRole role="creator">
                <ProductCredentialsPage />
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

          {/* VP Viewer protetto */}
          <Route
            path="/viewer/:vpId"
            element={
              <RequireRole role="company">
                <VPViewerPage />
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
