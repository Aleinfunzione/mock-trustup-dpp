import { create } from "zustand";
import { persist } from "zustand/middleware";

type Role = "admin" | "company" | "creator" | "operator" | "machine";

type UserSession = {
  did: string;
  role: Role;
  name: string;
  companyDid?: string;
};

const REGISTRY_KEY = "identity_registry";
const ADMIN_CREDS_KEY = "admin_credentials";

type Actor = {
  did: string;
  role: Role;
  name: string;
  publicKeyBase64: string;
  companyDid?: string;
  seed: string;
};

function loadRegistry(): Actor[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as Actor[]) : [];
  } catch {
    return [];
  }
}

type AuthState = {
  user: UserSession | null;
  loginWithSeed: (seed: string) => boolean;
  loginAdmin: (username: string, password: string) => boolean;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,

      // Login MOCK via seed
      loginWithSeed: (seed: string) => {
        if (!seed || seed.length < 10) return false;
        const reg = loadRegistry();
        const actor = reg.find((a) => a.seed === seed.trim());
        if (!actor) return false;
        set({
          user: {
            did: actor.did,
            role: actor.role,
            name: actor.name,
            companyDid: actor.companyDid,
          },
        });
        return true;
      },

      // Login Admin con username/password salvate in localStorage
      loginAdmin: (username: string, password: string) => {
        try {
          const creds = JSON.parse(localStorage.getItem(ADMIN_CREDS_KEY) || "null");
          if (!creds) return false;
          if (creds.username !== username || creds.password !== password) return false;

          const reg = loadRegistry();
          const admin =
            reg.find((a) => a.did === creds.adminDid) || reg.find((a) => a.role === "admin");
          if (!admin) return false;

          set({ user: { did: admin.did, role: "admin", name: admin.name } });
          return true;
        } catch {
          return false;
        }
      },

      logout: () => set({ user: null }),
    }),
    { name: "auth_store" }
  )
);
