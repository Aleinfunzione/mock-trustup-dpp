import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MinimalLayout from "@/components/layout/MinimalLayout";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RequireRole from "./RequireRole";

import LoginPage from "@/pages/auth/LoginPage";
import LogoutPage from "@/pages/auth/LogoutPage";

import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import CompanyDashboard from "@/pages/dashboards/CompanyDashboard";
import CreatorDashboard from "@/pages/dashboards/CreatorDashboard";
import OperatorDashboard from "@/pages/dashboards/OperatorDashboard";
import MachineDashboard from "@/pages/dashboards/MachineDashboard";

import CompaniesPage from "@/pages/admin/CompaniesPage";
import TeamPage from "@/pages/company/TeamPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pagine auth con header (senza sidebar) */}
        <Route element={<MinimalLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/logout" element={<LogoutPage />} />
        </Route>

        {/* Dashboard con sidebar */}
        <Route element={<DashboardLayout />}>
          <Route element={<RequireRole roles={["admin"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/companies" element={<CompaniesPage />} />
          </Route>

          <Route element={<RequireRole roles={["company"]} />}>
            <Route path="/company" element={<CompanyDashboard />} />
            <Route path="/company/team" element={<TeamPage />} />
          </Route>

          <Route element={<RequireRole roles={["creator"]} />}>
            <Route path="/creator" element={<CreatorDashboard />} />
          </Route>
          <Route element={<RequireRole roles={["operator"]} />}>
            <Route path="/operator" element={<OperatorDashboard />} />
          </Route>
          <Route element={<RequireRole roles={["machine"]} />}>
            <Route path="/machine" element={<MachineDashboard />} />
          </Route>
        </Route>

        {/* Default */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
