import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Role = "admin" | "company" | "creator" | "operator" | "machine";

export type User = {
  role: Role;
  did?: string;     // TODO: quando integri la derivazione DID
  seed?: string;    // mock-only (evita in produzione)
};

type AuthContextValue = {
  user: User | null;
  loginWithSeed: (seed: string) => Promise<User>;
  logout: () => void;
  pathForRole: (role: Role) => string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ------- util -------
function pathForRole(role: Role): string {
  switch (role) {
    case "admin": return "/admin";
    case "company": return "/company";
    case "creator": return "/creator";
    case "operator": return "/operator";
    default: return "/machine";
  }
}

function resolveRoleBySeed(seed: string): Role {
  const s = (seed || "").trim();

  const adminSeed   = import.meta.env.VITE_ADMIN_SEED?.trim();
  const companySeed = import.meta.env.VITE_COMPANY_SEED?.trim();
  const creatorSeed = import.meta.env.VITE_CREATOR_SEED?.trim();

  if (adminSeed && s === adminSeed) return "admin";
  if (companySeed && s === companySeed) return "company";
  if (creatorSeed && s === creatorSeed) return "creator";

  // Lookup mock opzionale
  try {
    const members = JSON.parse(localStorage.getItem("members") || "[]") as Array<{ seed?: string; role?: Role }>;
    const found = members.find((m) => (m.seed || "").trim() === s && m.role);
    if (found?.role) return found.role as Role;
  } catch {/* ignore */}

  return "company"; // fallback conservativo
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // ripristina sessione mock
  useEffect(() => {
    const role = localStorage.getItem("currentRole") as Role | null;
    if (role) setUser({ role });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      loginWithSeed: async (seed: string) => {
        const role = resolveRoleBySeed(seed);
        const newUser: User = { role, seed }; // mock; rimuovi seed se non serve
        setUser(newUser);
        localStorage.setItem("currentRole", role);
        return newUser;
      },
      logout: () => {
        setUser(null);
        localStorage.removeItem("currentRole");
      },
      pathForRole,
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
