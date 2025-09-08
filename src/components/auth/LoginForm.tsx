import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import AdminLoginForm from "@/components/auth/AdminLoginForm";
import { useNavigate } from "react-router-dom";

export default function LoginForm() {
  // Mostriamo di default la TAB Admin per facilitare i test
  const [mode, setMode] = useState<"admin" | "seed">("admin");
  const navigate = useNavigate();
  const { user, loginWithSeed } = useAuthStore();

  const [seed, setSeed] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSeedLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ok = loginWithSeed(seed.trim());
    if (!ok) setError("DID non registrato oppure seed non valida.");
  }

  // Redirect post-login
  useEffect(() => {
    if (!user) return;
    const routeByRole: Record<string, string> = {
      admin: "/admin",
      company: "/company",
      creator: "/creator",
      operator: "/operator",
      machine: "/machine",
    };
    navigate(routeByRole[user.role] ?? "/login", { replace: true });
  }, [user, navigate]);

  return (
    <div className="w-full max-w-xl">
      <Card className="rounded-2xl shadow-sm mb-4">
        <CardContent className="p-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">TRUSTUP • MOCK</h1>
          <div className="text-sm text-muted-foreground">UI base shadcn pronta</div>
        </CardContent>
      </Card>

      {/* TAB SWITCH */}
      <div className="flex gap-2 mb-3">
        <Button
          variant={mode === "admin" ? "default" : "secondary"}
          onClick={() => setMode("admin")}
        >
          Admin
        </Button>
        <Button
          variant={mode === "seed" ? "default" : "secondary"}
          onClick={() => setMode("seed")}
        >
          Seed (DID)
        </Button>
      </div>

      {/* CONTENUTO TAB */}
      {mode === "admin" ? (
        <AdminLoginForm />
      ) : (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Accesso con Seed</h2>
            <form onSubmit={handleSeedLogin} className="grid gap-4">
              <div>
                <Label htmlFor="seed">Seed phrase</Label>
                <Input
                  id="seed"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="inserisci le 12/24 parole..."
                />
              </div>
              {error && <div className="text-sm text-red-500">{error}</div>}
              <Button type="submit">Continua</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="mt-3 text-xs text-muted-foreground text-center">
        Ambiente <span className="font-medium">MOCK locale</span>: credenziali e seed sono salvate nel
        <span className="font-medium"> localStorage</span>.
      </div>
    </div>
  );
}
