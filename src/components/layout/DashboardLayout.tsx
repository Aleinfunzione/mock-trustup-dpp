import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import CreditBalance from "@/components/credit/CreditBalance";
import { useAuthStore } from "@/stores/authStore";
import LowBalanceWatcher from "@/components/credit/LowBalanceWatcher";
import { prefetchOnIdle } from "@/services/schema/loader";
import CreditIndicator from "@/components/credit/CreditIndicator";

export default function DashboardLayout() {
  const location = useLocation();
  const { currentUser } = useAuthStore();
  const isAdmin = (currentUser?.role || "").toLowerCase() === "admin";

  React.useEffect(() => {
    const cancel = prefetchOnIdle();
    return () => cancel();
  }, []);

  const watcherKey =
    (currentUser as any)?.did ||
    (currentUser as any)?.id ||
    (currentUser as any)?.email ||
    "user";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header con indicatore crediti a destra */}
      <div className="relative">
        <Header />
        <div className="absolute inset-y-0 right-4 flex items-center">
          <CreditIndicator />
        </div>
      </div>

      {currentUser ? <LowBalanceWatcher key={watcherKey} /> : null}

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-72 shrink-0">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] border-r border-sidebar-border bg-sidebar flex flex-col">
            {isAdmin && (
              <div className="p-3 border-b border-sidebar-border bg-sidebar">
                <div className="text-xs text-muted-foreground mb-1">Saldo Admin</div>
                <CreditBalance />
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </aside>

        {/* Main */}
        <main
          className="flex-1 min-h-0 h-[calc(100vh-3.5rem)] overflow-y-auto relative"
          aria-live="polite"
        >
          <div className="p-4 md:p-6">
            <Outlet key={location.pathname} />
          </div>
        </main>
      </div>
    </div>
  );
}
