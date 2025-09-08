import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-muted">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="ml-72 p-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
