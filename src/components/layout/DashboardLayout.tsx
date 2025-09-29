import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 min-h-0">
        {/* Colonna sinistra */}
        <aside className="w-72 shrink-0">
          {/* Contenitore sticky sotto l'header */}
          <div className="sticky top-14 z-50 h-[calc(100vh-3.5rem)] border-r bg-card/50">
            {/* Scroll interno solo se il menu supera l’altezza */}
            <div className="h-full overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </aside>

        {/* Contenuto scrollabile */}
        <main
          className="flex-1 min-h-0 h-[calc(100vh-3.5rem)] overflow-y-auto relative z-0 isolate"
          aria-live="polite"
          aria-busy="false"
        >
          <div className="p-4 md:p-6">
            <Outlet key={location.pathname} />
          </div>
        </main>
      </div>
    </div>
  );
}
