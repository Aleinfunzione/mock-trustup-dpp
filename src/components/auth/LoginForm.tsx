import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LogIn, Crown } from "lucide-react";

// ✅ legge direttamente l'env (niente memo)
const ADMIN_SEED = import.meta.env.VITE_ADMIN_SEED?.trim();

export default function LoginForm() {
  const navigate = useNavigate();
  const [seed, setSeed] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // DEBUG: vedi in console se l'env c'è
  // (rimuovi dopo il test)
  console.log("VITE_ADMIN_SEED presente?", Boolean(ADMIN_SEED));

  const resolveRoleBySeed = (mnemonic: string) => {
    const s = mnemonic.trim();
    if (ADMIN_SEED && s === ADMIN_SEED) return "admin";

    // eventuali seed demo personalizzate
    const company = import.meta.env.VITE_COMPANY_SEED?.trim();
    const creator = import.meta.env.VITE_CREATOR_SEED?.trim();
    if (company && s === company) return "company";
    if (creator && s === creator) return "creator";

    // lookup locale opzionale
    try {
      const members = JSON.parse(localStorage.getItem("members") || "[]") as Array<{ seed?: string; role?: string }>;
      const found = members.find((m) => (m.seed || "").trim() === s && m.role);
      if (found?.role) return found.role;
    } catch {}

    return "company";
  };

  const pathForRole = (role: string) => {
    if (role === "admin") return "/admin";
    if (role === "company") return "/company";
    if (role === "creator") return "/creator";
    if (role === "operator") return "/operator";
    return "/machine";
  };

  const finalizeLogin = (mnemonic: string) => {
    const role = resolveRoleBySeed(mnemonic);
    localStorage.setItem("currentRole", role);
    navigate(pathForRole(role), { replace: true });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seed.trim()) return;
    setLoading(true);
    finalizeLogin(seed);
  };

  const quickAdmin = () => {
    if (!ADMIN_SEED) return;
    setSeed(ADMIN_SEED);
    finalizeLogin(ADMIN_SEED);
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
      </div>

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={loading} className="w-full text-base">
          <LogIn className="h-4 w-4 mr-2" />
          {loading ? "Verifico…" : "Continua"}
        </Button>

        {/* ✅ Bottone Admin visibile SOLO se VITE_ADMIN_SEED è settata */}
        {ADMIN_SEED && (
          <Button
            type="button"
            variant="outline"
            className="w-full text-base border-emerald-500/40 hover:bg-emerald-500/10"
            onClick={quickAdmin}
            title="Auto-compila con la seed Admin configurata"
          >
            <Crown className="h-4 w-4 mr-2" />
            Accedi come Admin (demo)
          </Button>
        )}
      </div>
    </form>
  );
}
