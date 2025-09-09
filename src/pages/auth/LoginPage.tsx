import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown } from "lucide-react";

import LoginForm from "@/components/auth/LoginForm";
import { useAuthStore } from "@/stores/authStore";
import { getAdminSeed } from "@/utils/env";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, loginAdmin } = useAuthStore();

  // Stato form admin
  const [username, setUsername] = useState<string>("admin");
  const [password, setPassword] = useState<string>("demo");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Info di debug sulla seed admin
  const adminSeed = getAdminSeed();
  const forced = typeof window !== "undefined" && localStorage.getItem("forceAdminDemo") === "1";
  const enabled = Boolean(adminSeed) || forced;

  // Redirect automatico se già loggato
  useEffect(() => {
    if (!user) return;
    const dest =
      user.role === "admin"
        ? "/admin"
        : user.role === "company"
        ? "/company"
        : user.role === "creator"
        ? "/creator"
        : user.role === "operator"
        ? "/operator"
        : "/machine";

    const from = (location.state as any)?.from?.pathname;
    navigate(from ?? dest, { replace: true });
  }, [user, navigate, location.state]);

  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAdminError(null);
    setSubmitting(true);
    try {
      const ok = loginAdmin(username.trim(), password);
      if (!ok) {
        setAdminError("Credenziali non valide. Riprova (admin / demo) oppure configura .env.");
        return;
      }
      // Il redirect lo fa l'useEffect sopra quando user è valorizzato
    } finally {
      setSubmitting(false);
    }
  }

  // Quick button per demo forzata (facoltativo): usa solo il redirect client
  function handleDemoForce() {
    // Non setta lo store: serve solo per chi vuole “saltare” alla pagina,
    // ma NON mostra il tasto Admin in sidebar. Meglio usare il form sopra.
    navigate("/admin", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] p-4">
      <Card className="w-full max-w-xl border-zinc-800 bg-[#0F1526] text-zinc-100">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">TRUSTUP • MOCK</CardTitle>
          <CardDescription className="text-zinc-400">
            Accedi con <b>seed</b> oppure con <b>credenziali Admin</b>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Login via SEED (rimane il tuo componente esistente) */}
          <div className="space-y-3">
            <LoginForm />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <div className="h-px flex-1 bg-zinc-800" />
            oppure
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* Login Admin username/password */}
          <form onSubmit={handleAdminSubmit} className="rounded-md border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Crown className="h-4 w-4 text-amber-400" />
              Accesso Admin
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="admin-username">Username</Label>
                <Input
                  id="admin-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="bg-transparent"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="demo"
                  autoComplete="current-password"
                  className="bg-transparent"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full text-base"
              disabled={submitting}
            >
              {submitting ? "Accesso in corso…" : "Entra come Admin"}
            </Button>

            {adminError && <p className="text-red-400 text-sm">{adminError}</p>}

            {/* Box info/debug seed admin */}
            <div className="mt-2 rounded-md bg-zinc-900/50 p-3 text-xs">
              Admin seed presente?{" "}
              <b className={adminSeed ? "text-emerald-400" : "text-red-400"}>
                {adminSeed ? "SÌ" : "NO"}
              </b>
              <div className="mt-1 text-zinc-400 break-words">
                Valore: {adminSeed ?? <i>undefined</i>}
              </div>
              {!enabled && (
                <div className="mt-2 text-zinc-500">
                  Puoi forzare una prova rapida impostando:
                  <pre className="mt-1 whitespace-pre-wrap">
{`localStorage.setItem("VITE_ADMIN_SEED","${"clutch captain shoe salt awake harvest setup primary inmate ugly among become"}");
location.reload();`}
                  </pre>
                </div>
              )}
            </div>
          </form>
        </CardContent>

        <CardFooter className="text-xs text-zinc-500 flex flex-col gap-2">
          <div>
            Credenziali demo consigliate: <code>admin / demo</code>.<br />
            Personalizzabili via <code>.env.local</code> con{" "}
            <code>VITE_DEFAULT_ADMIN_USERNAME</code> e <code>VITE_DEFAULT_ADMIN_PASSWORD</code>.
          </div>
          <div className="opacity-70">
            (Solo debug) Vai direttamente a <Button variant="link" className="px-0 text-xs" onClick={handleDemoForce}>/admin</Button> — non abilita i permessi.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
