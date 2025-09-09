import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MinimalLayout from "@/components/layout/MinimalLayout";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RequireRole from "./RequireRole";

import LoginPage from "@/pages/auth/LoginPage";

import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import CompanyDashboard from "@/pages/dashboards/CompanyDashboard";
import CreatorDashboard from "@/pages/dashboards/CreatorDashboard";
import OperatorDashboard from "@/pages/dashboards/OperatorDashboard";
import MachineDashboard from "@/pages/dashboards/MachineDashboard";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pagine senza sidebar */}
        <Route element={<MinimalLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Pagine protette (con sidebar) */}
        <Route element={<DashboardLayout />}>
          <Route
            path="/admin"
            element={
              <RequireRole allow={["admin"]}>
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/company"
            element={
              <RequireRole allow={["company", "admin"]}>
                <CompanyDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/creator"
            element={
              <RequireRole allow={["creator", "admin"]}>
                <CreatorDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/operator"
            element={
              <RequireRole allow={["operator", "admin"]}>
                <OperatorDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/machine"
            element={
              <RequireRole allow={["machine", "admin"]}>
                <MachineDashboard />
              </RequireRole>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
