import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, LogIn, Crown, Building2, UserPlus2 } from "lucide-react";
import { getAdminSeed, getCompanySeed, getCreatorSeed } from "@/utils/env";

// (opzionale) se hai l'AuthContext, puoi importarlo e usarlo
let useAuth: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useAuth = require("@/contexts/AuthContext").useAuth;
} catch {
  useAuth = null;
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

function resolveRoleBySeed(seed: string): Role {
  const s = seed.trim();
  const admin = getAdminSeed();
  const company = getCompanySeed();
  const creator = getCreatorSeed();

  if (admin && s === admin) return "admin";
  if (company && s === company) return "company";
  if (creator && s === creator) return "creator";

  // lookup locale opzionale
  try {
    const members = JSON.parse(localStorage.getItem("members") || "[]") as Array<{ seed?: string; role?: Role }>;
    const found = members.find((m) => (m.seed || "").trim() === s && m.role);
    if (found?.role) return found.role as Role;
  } catch {}

  return "company";
}

export default function LoginForm() {
  const navigate = useNavigate();
  const auth = useAuth ? useAuth() : null;

  const [seed, setSeed] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const adminSeed = getAdminSeed();
  const companySeed = getCompanySeed();
  const creatorSeed = getCreatorSeed();

  const hasAdmin = useMemo(() => Boolean(adminSeed), [adminSeed]);
  const hasCompany = useMemo(() => Boolean(companySeed), [companySeed]);
  const hasCreator = useMemo(() => Boolean(creatorSeed), [creatorSeed]);

  // Log diagnostico (rimuovi dopo)
  console.log("[LoginForm] hasAdmin?", hasAdmin, "adminSeed:", adminSeed);

  const finalize = async (seedToUse: string) => {
    if (auth) {
      const user = await auth.loginWithSeed(seedToUse);
      navigate(auth.pathForRole(user.role), { replace: true });
      return;
    }
    const role = resolveRoleBySeed(seedToUse);
    localStorage.setItem("currentRole", role);
    navigate(pathForRole(role), { replace: true });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!seed.trim()) return;
    setLoading(true);
    await finalize(seed);
  };

  const quick = async (which: "admin" | "company" | "creator") => {
    const map = { admin: adminSeed, company: companySeed, creator: creatorSeed } as const;
    const val = map[which];
    if (!val) return;
    setSeed(val);
    await finalize(val);
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

        {hasAdmin && (
          <Button
            type="button"
            variant="outline"
            className="w-full text-base border-emerald-500/40 hover:bg-emerald-500/10"
            onClick={() => quick("admin")}
            title="Accedi con la seed Admin configurata"
          >
            <Crown className="h-4 w-4 mr-2" />
            Accedi come Admin (demo)
          </Button>
        )}

        {(hasCompany || hasCreator) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {hasCompany && (
              <Button type="button" variant="secondary" className="w-full text-base" onClick={() => quick("company")}>
                <Building2 className="h-4 w-4 mr-2" />
                Accedi come Azienda (demo)
              </Button>
            )}
            {hasCreator && (
              <Button type="button" variant="secondary" className="w-full text-base" onClick={() => quick("creator")}>
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
