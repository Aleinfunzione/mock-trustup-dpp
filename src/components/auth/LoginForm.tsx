// src/components/auth/LoginForm.tsx
import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, LogIn, Crown, Building2, UserPlus2 } from "lucide-react";
import { getAdminSeed, getCompanySeed, getCreatorSeed } from "@/utils/env";

// (opzionale) usa AuthContext se presente, altrimenti fallback su localStorage
let useAuth: undefined | (() => {
  loginWithSeed: (seed: string) => Promise<{ role: Role }>;
  pathForRole: (role: Role) => string;
});
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useAuth = require("@/contexts/AuthContext").useAuth;
} catch {
  // nessun AuthContext: useremo il fallback locale
}

type Role = "admin" | "company" | "creator" | "operator" | "machine";

function pathForRoleFallback(role: Role) {
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
  const admin   = getAdminSeed();
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

  const [seed, setSeed] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // Env + fallback da localStorage
  const adminSeed   = getAdminSeed();
  const companySeed = getCompanySeed();
  const creatorSeed = getCreatorSeed();

  const hasAdmin   = useMemo(() => Boolean(adminSeed),   [adminSeed]);
  const hasCompany = useMemo(() => Boolean(companySeed), [companySeed]);
  const hasCreator = useMemo(() => Boolean(creatorSeed), [creatorSeed]);

  const finalizeLogin = async (seedToUse: string) => {
    if (auth) {
      // via AuthContext (preferibile)
      const u = await auth.loginWithSeed(seedToUse);
      navigate(auth.pathForRole(u.role) as string, { replace: true });
      return;
    }
    // fallback locale
    const role = resolveRoleBySeedFallback(seedToUse);
    localStorage.setItem("currentRole", role);
    navigate(pathForRoleFallback(role), { replace: true });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!seed.trim()) return;
    setLoading(true);
    await finalizeLogin(seed);
  };

  const quickLogin = async (which: "admin" | "company" | "creator") => {
    const map = { admin: adminSeed, company: companySeed, creator: creatorSeed } as const;
    const value = map[which];
    if (!value) return;
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
            placeholder="inserisci le 12/24 parole…"
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
        <p className="text-xs text-zinc-500">La seed è usata solo in sessione (mock).</p>
      </div>

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={loading} className="w-full text-base">
          <LogIn className="h-4 w-4 mr-2" />
          {loading ? "Verifico…" : "Continua"}
        </Button>

        {/* Quick-login demo */}
        {hasAdmin && (
          <Button
            type="button"
            variant="outline"
            className="w-full text-base border-emerald-500/40 hover:bg-emerald-500/10"
            onClick={() => quickLogin("admin")}
            title="Accedi con la seed Admin (env/localStorage)"
          >
            <Crown className="h-4 w-4 mr-2" />
            Accedi come Admin (demo)
          </Button>
        )}

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
                Accedi come Azienda (demo)
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
                <UserPlus2 className="h-4 w-4 mr-2" />
                Accedi come Creator (demo)
              </Button>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
