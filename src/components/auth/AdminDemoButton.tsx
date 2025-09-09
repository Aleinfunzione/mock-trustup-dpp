import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Mostra "Accedi come Admin (demo)" se:
 *  - esiste VITE_ADMIN_SEED, OPPURE
 *  - esiste localStorage.forceAdminDemo === "1" (fallback di debug).
 *
 * NB: Non dipende dal tuo LoginForm: vive fuori dal form.
 */
export default function AdminDemoButton() {
  const adminSeed = import.meta.env.VITE_ADMIN_SEED?.trim();
  const navigate = useNavigate();

  // Fallback di debug: puoi forzare la visualizzazione con:
  // localStorage.setItem("forceAdminDemo", "1")
  const forced = typeof window !== "undefined" && localStorage.getItem("forceAdminDemo") === "1";

  const enabled = Boolean(adminSeed) || forced;

  // Log di diagnosi (rimuovi dopo)
  console.log("[AdminDemoButton] VITE_ADMIN_SEED presente?", Boolean(adminSeed), "forced?", forced);

  if (!enabled) return null;

  const handleClick = () => {
    // Mock session
    localStorage.setItem("currentRole", "admin");
    // Se vuoi, memorizza anche la seed admin nel registry mock:
    // try {
    //   const members = JSON.parse(localStorage.getItem("members") || "[]");
    //   if (!members.find((m:any)=>m.role==="admin")) {
    //     members.push({ seed: adminSeed || "admin-mock", role: "admin" });
    //     localStorage.setItem("members", JSON.stringify(members));
    //   }
    // } catch {}
    navigate("/admin", { replace: true });
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full text-base border-emerald-500/40 hover:bg-emerald-500/10"
      onClick={handleClick}
      title="Login mock con seed Admin definita in .env.local (o forzata)"
    >
      <Crown className="h-4 w-4 mr-2" />
      Accedi come Admin (demo)
    </Button>
  );
}
