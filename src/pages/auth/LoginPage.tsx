import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Shield, User } from "lucide-react";

import LoginForm from "@/components/auth/LoginForm";
import { useAuthStore } from "@/stores/authStore";
import { getAdminSeed } from "@/utils/env";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, loginAdmin } = useAuthStore();

  // Stato per la modalità di login
  const [loginMode, setLoginMode] = useState<'user' | 'admin'>('user');

  // Stato form admin
  const [adminUsername, setAdminUsername] = useState<string>("admin");
  const [adminPassword, setAdminPassword] = useState<string>("demo");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Info di debug sulla seed admin
  const adminSeed = getAdminSeed();
  const forced = typeof window !== "undefined" && localStorage.getItem("ForceAdminDemo") === "1";
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

  // Gestione login admin con username/password
  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAdminError(null);
    setSubmitting(true);
    
    try {
      const ok = loginAdmin(adminUsername.trim(), adminPassword);
      if (!ok) {
        setAdminError("Credenziali admin non valide. Riprova con admin/demo");
        return;
      }
      // Il redirect sarà gestito dall'useEffect sopra
    } catch (error) {
      console.error("Errore login admin:", error);
      setAdminError("Errore durante il login admin");
    } finally {
      setSubmitting(false);
    }
  }

  // Login rapido con admin seed
  function handleAdminSeedLogin() {
    if (!adminSeed) {
      setAdminError("Admin seed non disponibile");
      return;
    }
    
    setSubmitting(true);
    try {
      const ok = loginAdmin(adminSeed.trim(), "demo");
      if (!ok) {
        setAdminError("Errore nel login con admin seed");
      }
      // Il redirect sarà gestito dall'useEffect sopra
    } catch (error) {
      console.error("Errore login admin seed:", error);
      setAdminError("Errore durante il login con admin seed");
    } finally {
      setSubmitting(false);
    }
  }

  // Forza admin seed nel localStorage
  function forceAdminSeed() {
    localStorage.setItem("VITE_ADMIN_SEED", "clutch captain shoe salt awake harvest setup primary inmate ugly aeon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon");
    localStorage.setItem("ForceAdminDemo", "1");
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] p-4">
      <Card className="w-full max-w-xl border-zinc-800 bg-[#0F1526] text-zinc-600">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">TRUSTUP • MOCK</CardTitle>
          <CardDescription className="text-zinc-400">
            {loginMode === 'user' ? 'Accedi con seed phrase' : 'Accesso riservato amministratori'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Toggle tra modalità User e Admin */}
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
            <button
              onClick={() => setLoginMode('user')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                loginMode === 'user'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <User className="h-4 w-4" />
              Utenti
            </button>
            <button
              onClick={() => setLoginMode('admin')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                loginMode === 'admin'
                  ? 'bg-red-900/50 text-red-300 border border-red-500/50'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin
            </button>
          </div>

          {/* Modalità User - Login con Seed */}
          {loginMode === 'user' && (
            <div className="space-y-4">
              <div className="text-sm text-zinc-400">
                Inserisci la tua seed phrase per accedere come utente del sistema
              </div>
              <LoginForm />
            </div>
          )}

          {/* Modalità Admin - Login separato */}
          {loginMode === 'admin' && (
            <div className="space-y-4">
              {/* Sezione Login Admin con Username/Password */}
              <div className="rounded-lg border border-red-500/30 bg-red-900/10 p-4 space-y-4">
                <div className="flex items-center gap-2 text-red-300 font-medium">
                  <Crown className="h-5 w-5" />
                  Accesso Amministratore
                </div>
                
                <form onSubmit={handleAdminSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-username" className="text-zinc-300">Username</Label>
                      <Input
                        id="admin-username"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="admin"
                        autoComplete="username"
                        className="bg-zinc-900/50 border-zinc-700 text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-password" className="text-zinc-300">Password</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="demo"
                        autoComplete="current-password"
                        className="bg-zinc-900/50 border-zinc-700 text-white"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    disabled={submitting}
                  >
                    {submitting ? "Accesso in corso..." : "🔑 Accedi come Admin"}
                  </Button>

                  {adminError && (
                    <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded p-2">
                      {adminError}
                    </div>
                  )}
                </form>
              </div>

              {/* Sezione Admin Seed (se disponibile) */}
              {adminSeed && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-4 space-y-3">
                  <div className="text-amber-300 font-medium text-sm">
                    🔐 Login Rapido Admin (Seed)
                  </div>
                  <Button
                    onClick={handleAdminSeedLogin}
                    variant="outline"
                    className="w-full border-amber-500/50 text-amber-300 hover:bg-amber-900/20"
                    disabled={submitting}
                  >
                    Accedi con Admin Seed
                  </Button>
                </div>
              )}

              {/* Debug Info */}
              <div className="rounded-lg border border-zinc-700 bg-zinc-900/30 p-3 space-y-2">
                <div className="text-xs text-zinc-400">
                  <strong>Debug Info:</strong>
                </div>
                <div className="text-xs text-zinc-500">
                  Admin seed presente: {" "}
                  <span className={adminSeed ? "text-emerald-400" : "text-red-400"}>
                    {adminSeed ? "✓ SI" : "✗ NO"}
                  </span>
                </div>
                {!adminSeed && (
                  <Button
                    onClick={forceAdminSeed}
                    variant="outline"
                    size="sm"
                    className="text-xs border-zinc-600 text-zinc-400 hover:text-zinc-300"
                  >
                    Configura Admin Seed per Test
                  </Button>
                )}
                {enabled && (
                  <div className="text-xs text-zinc-500 mt-2">
                    <details>
                      <summary className="cursor-pointer hover:text-zinc-400">
                        Configurazione manuale
                      </summary>
                      <pre className="mt-1 text-xs bg-zinc-800 p-2 rounded overflow-x-auto">
{`localStorage.setItem("VITE_ADMIN_SEED", 
"clutch captain shoe salt awake harvest setup primary inmate ugly aeon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon");
location.reload();`}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="text-xs text-zinc-500">
          <div className="w-full space-y-1">
            {loginMode === 'user' ? (
              <div>
                Utilizza la tua seed phrase BIP39 per accedere al sistema come utente registrato.
              </div>
            ) : (
              <div>
                <div>Credenziali admin di default: <code className="bg-zinc-800 px-1 rounded">admin</code> / <code className="bg-zinc-800 px-1 rounded">demo</code></div>
                <div className="mt-1">Configurabili tramite variabili d'ambiente <code className="bg-zinc-800 px-1 rounded">VITE_DEFAULT_ADMIN_*</code></div>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}