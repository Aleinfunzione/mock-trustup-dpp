// src/components/auth/LoginForm.tsx
import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Eye, EyeOff, LogIn, Crown, Building2 } from "lucide-react";
import { getAdminSeed, getCompanySeed, getCreatorSeed } from "@/utils/env";

// (opzionale) usa AuthContext se presente, altrimenti fallback su localStorage
let useAuth: any;
try {
  useAuth = require("@/contexts/AuthContext").useAuth;
} catch {
  // nessun AuthContext: useremo il fallback locale
}

type Role = "admin" | "company" | "creator" | "operator" | "machine";

function pathForRole(role: Role) {
  switch (role) {
    case "admin": return "/admin";
    case "company": return "/company";
    case "creator": return "/creator";
    case "operator": return "/operator";
    default: return "/machine";
  }
}

function resolveRoleBySeedFallback(seed: string): Role {
  const s = seed.trim();
  const admin = getAdminSeed();
  const company = getCompanySeed();
  const creator = getCreatorSeed();

  if (admin && s === admin) return "admin";
  if (company && s === company) return "company";
  if (creator && s === creator) return "creator";

  // lookup locale opzionale (registry mock)
  try {
    const members = JSON.parse(localStorage.getItem("members") || "[]") as Array<{ seed?: string; role?: Role }>;
    const found = members.find((m) => (m.seed || "").trim() === s && m.role);
    if (found?.role) return found.role as Role;
  } catch {/* ignore */}

  return "company";
}

export default function LoginForm() {
  const navigate = useNavigate();
  const auth = useAuth ? useAuth() : undefined;

  const [seed, setSeed] = useState<string>("");
  const [show, setShow] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Env + fallback da localStorage
  const adminSeed = getAdminSeed();
  const companySeed = getCompanySeed();
  const creatorSeed = getCreatorSeed();

  // CORREZIONE: Assicuriamoci che hasAdmin sia sempre definito correttamente
  const hasAdmin = useMemo(() => {
    const adminAvailable = Boolean(adminSeed);
    console.log('🔍 hasAdmin check:', { adminSeed, adminAvailable });
    return adminAvailable;
  }, [adminSeed]);

  const hasCompany = useMemo(() => Boolean(companySeed), [companySeed]);
  const hasCreator = useMemo(() => Boolean(creatorSeed), [creatorSeed]);

  const finalizeLogin = async (seedToUse: string) => {
    try {
      // via AuthContext (preferibile)
      if (auth?.loginWithSeed) {
        const u = await auth.loginWithSeed(seedToUse);
        navigate(auth.pathForRole(u.role) as string, { replace: true });
      } else {
        // fallback locale
        const role = resolveRoleBySeedFallback(seedToUse);
        localStorage.setItem("currentRole", role);
        navigate(pathForRole(role), { replace: true });
      }
    } catch (error) {
      console.error('❌ Errore finalizeLogin:', error);
      // fallback locale
      const role = resolveRoleBySeedFallback(seedToUse);
      localStorage.setItem("currentRole", role);
      navigate(pathForRole(role), { replace: true });
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!seed.trim()) return;
    setLoading(true);
    await finalizeLogin(seed);
  };

  // CORREZIONE: Funzione quickLogin migliorata
  const quickLogin = async (which: "admin" | "company" | "creator") => {
    console.log('🚀 quickLogin called with:', which);
    
    const map = { 
      admin: adminSeed, 
      company: companySeed, 
      creator: creatorSeed 
    } as const;
    
    const value = map[which];
    if (!value) {
      console.error('❌ No seed available for:', which);
      return;
    }
    
    console.log('✅ Using seed for', which, ':', value.substring(0, 20) + '...');
    setSeed(value);
    await finalizeLogin(value);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-300">Seed phrase</label>
        <div className="flex items-center gap-2">
          <Input
            type={show ? "text" : "password"}
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="inserisci le 12/24 parole..."
            className="bg-[#0B1222] border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
          />
          <Button
            type="button"
            variant="secondary"
            className="border-zinc-700 bg-[#0C1426] text-zinc-200"
            onClick={() => setShow((v) => !v)}
            title={show ? "Nascondi" : "Mostra"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        La seed è usata solo in sessione (mock).
      </p>

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={loading} className="w-full text-base">
          <LogIn className="h-4 w-4 mr-2" />
          {loading ? "Verifica..." : "Continua"}
        </Button>
      </div>

      {/* CORREZIONE: Sezione Admin sempre visibile quando hasAdmin è true */}
      {hasAdmin && (
        <div className="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-900/10">
          <div className="text-red-300 font-medium text-sm mb-2 flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Accesso Amministratore
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full border-red-500/50 text-red-300 hover:bg-red-900/20 hover:text-red-200"
            onClick={() => {
              console.log('🔑 Admin button clicked');
              quickLogin("admin");
            }}
            title="Accedi con la seed Admin (env/localStorage)"
          >
            <Crown className="h-4 w-4 mr-2" />
            🔑 Accedi come Admin
          </Button>
        </div>
      )}

      {/* Demo rapidi per Company e Creator */}
      {(hasCompany || hasCreator) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {hasCompany && (
            <Button
              type="button"
              variant="secondary"
              className="w-full text-base"
              onClick={() => quickLogin("company")}
              title="Accedi con la seed Azienda (env/localStorage)"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Azienda
            </Button>
          )}
          {hasCreator && (
            <Button
              type="button"
              variant="secondary"
              className="w-full text-base"
              onClick={() => quickLogin("creator")}
              title="Accedi con la seed Creator (env/localStorage)"
            >
              <Crown className="h-4 w-4 mr-2" />
              Creator
            </Button>
          )}
        </div>
      )}

      {/* Debug info - solo in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 rounded border border-zinc-700 bg-zinc-900/30 text-xs text-zinc-400">
          <div><strong>Debug:</strong></div>
          <div>Admin seed: {hasAdmin ? '✅ Disponibile' : '❌ Non trovata'}</div>
          <div>Company seed: {hasCompany ? '✅ Disponibile' : '❌ Non trovata'}</div>
          <div>Creator seed: {hasCreator ? '✅ Disponibile' : '❌ Non trovata'}</div>
          {!hasAdmin && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("VITE_ADMIN_SEED", "clutch captain shoe salt awake harvest setup primary inmate ugly aeon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon");
                  window.location.reload();
                }}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Configura Admin Seed per Test
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
