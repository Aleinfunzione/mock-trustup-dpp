import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import LoginForm from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAdminSeed } from "@/utils/env";

export default function LoginPage() {
  const navigate = useNavigate();
  const adminSeed = getAdminSeed();

  // fallback di debug
  const forced = typeof window !== "undefined" && localStorage.getItem("forceAdminDemo") === "1";
  const enabled = Boolean(adminSeed) || forced;

  const handleAdmin = () => {
    localStorage.setItem("currentRole", "admin");
    navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] p-4">
      <Card className="w-full max-w-xl border-zinc-800 bg-[#0F1526] text-zinc-100">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">TRUSTUP • MOCK</CardTitle>
          <CardDescription className="text-zinc-400">Login con seed o quick-login demo</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <LoginForm />
          <div className="rounded-md border border-zinc-800 p-3 text-sm">
            <div className="mb-2">
              Admin seed presente?{" "}
              <b className={adminSeed ? "text-emerald-400" : "text-red-400"}>
                {adminSeed ? "SÌ" : "NO"}
              </b>
              <div className="text-xs text-zinc-400 break-all">
                Valore: {adminSeed ?? <i>undefined</i>}
              </div>
            </div>
            {enabled ? (
              <Button
                type="button"
                variant="outline"
                className="w-full text-base border-emerald-500/40 hover:bg-emerald-500/10"
                onClick={handleAdmin}
              >
                <Crown className="h-4 w-4 mr-2" />
                Accedi come Admin (demo)
              </Button>
            ) : (
              <div className="text-xs text-zinc-500">
                Per test immediato: apri console e lancia<br />
                <code>
                  localStorage.setItem("VITE_ADMIN_SEED","admin demo");<br />
                  location.reload();
                </code>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="text-xs text-zinc-500">
          Quick-login demo forzato anche via <code>localStorage.forceAdminDemo="1"</code>
        </CardFooter>
      </Card>
    </div>
  );
}
