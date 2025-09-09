import { create } from "zustand";
import { persist } from "zustand/middleware";

/** ──────────────────────────────────────────────────────────────────────────
 *  Tipi
 *  ────────────────────────────────────────────────────────────────────────── */
type Role = "admin" | "company" | "creator" | "operator" | "machine";

type UserSession = {
  did: string;
  role: Role;
  name: string;
  companyDid?: string;
};

type Actor = {
  did: string;
  role: Role;
  name: string;
  publicKeyBase64: string;
  companyDid?: string;
  seed: string; // MOCK: usata per login locale
};

/** ──────────────────────────────────────────────────────────────────────────
 *  Costanti & chiavi storage
 *  ────────────────────────────────────────────────────────────────────────── */
const REGISTRY_KEY = "identity_registry";
const ADMIN_CREDS_KEY = "admin_credentials";

// Valori di fallback (possono essere sovrascritti da .env)
const DEFAULT_ADMIN_SEED =
  (import.meta as any)?.env?.VITE_DEFAULT_ADMIN_SEED ??
  "clutch captain shoe salt awake harvest setup primary inmate ugly among become";

const DEFAULT_ADMIN_DID =
  (import.meta as any)?.env?.VITE_DEFAULT_ADMIN_DID ?? "did:mock:admin-0001";

const DEFAULT_ADMIN_NAME = "Administrator";

// Credenziali admin di default per loginAdmin() (solo mock, lato client)
const DEFAULT_ADMIN_USERNAME =
  (import.meta as any)?.env?.VITE_DEFAULT_ADMIN_USERNAME ?? "admin";
const DEFAULT_ADMIN_PASSWORD =
  (import.meta as any)?.env?.VITE_DEFAULT_ADMIN_PASSWORD ?? "admin";

/** ──────────────────────────────────────────────────────────────────────────
 *  Helpers di storage / bootstrap
 *  ────────────────────────────────────────────────────────────────────────── */
function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Garantisce che nel registro esista un attore admin con seed/DID di default
 * e che esistano le credenziali admin (username/password/adminDid).
 */
function bootstrapAdmin(): void {
  // 1) Credenziali admin
  const creds = readJSON<{ username: string; password: string; adminDid: string }>(ADMIN_CREDS_KEY);
  if (!creds) {
    writeJSON(ADMIN_CREDS_KEY, {
      username: DEFAULT_ADMIN_USERNAME,
      password: DEFAULT_ADMIN_PASSWORD,
      adminDid: DEFAULT_ADMIN_DID,
    });
  }

  // 2) Registro identità con attore admin
  const reg = readJSON<Actor[]>(REGISTRY_KEY) ?? [];
  const hasAdminByDid = reg.some(
    (a) => a.did.toLowerCase() === DEFAULT_ADMIN_DID.toLowerCase() && a.role === "admin"
  );
  const hasAdminBySeed = reg.some(
    (a) => a.seed.trim().toLowerCase() === DEFAULT_ADMIN_SEED.trim().toLowerCase()
  );

  if (!hasAdminByDid && !hasAdminBySeed) {
    reg.push({
      did: DEFAULT_ADMIN_DID,
      role: "admin",
      name: DEFAULT_ADMIN_NAME,
      publicKeyBase64: "",
      seed: DEFAULT_ADMIN_SEED,
    });
    writeJSON(REGISTRY_KEY, reg);
  }
}

/** Carica il registro (garantendo bootstrap admin prima) */
function loadRegistry(): Actor[] {
  bootstrapAdmin();
  return readJSON<Actor[]>(REGISTRY_KEY) ?? [];
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Zustand store
 *  ────────────────────────────────────────────────────────────────────────── */
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

      /**
       * Login MOCK via seed:
       * - se la seed combacia con quella admin di default → ruolo admin garantito
       * - altrimenti cerca nel registry un attore con quella seed
       */
      loginWithSeed: (seed: string) => {
        const s = (seed ?? "").trim();
        if (s.length < 10) return false;

        // Riconosci subito l'admin seed (anche senza registry consistente)
        if (s.toLowerCase() === DEFAULT_ADMIN_SEED.trim().toLowerCase()) {
          set({
            user: {
              did: DEFAULT_ADMIN_DID,
              role: "admin",
              name: DEFAULT_ADMIN_NAME,
            },
          });
          return true;
        }

        const reg = loadRegistry();
        const actor = reg.find((a) => a.seed.trim().toLowerCase() === s.toLowerCase());
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

      /**
       * Login Admin con username/password:
       * - usa ADMIN_CREDS_KEY; se mancano, bootstrap con valori di default
       */
      loginAdmin: (username: string, password: string) => {
        bootstrapAdmin();
        const creds = readJSON<{ username: string; password: string; adminDid: string }>(
          ADMIN_CREDS_KEY
        );
        if (!creds) return false;

        // Confronto credenziali
        if (creds.username !== username || creds.password !== password) return false;

        // Trova l'admin nel registry (o usa fallback)
        const reg = loadRegistry();
        const admin =
          reg.find((a) => a.did.toLowerCase() === creds.adminDid.toLowerCase()) ||
          reg.find((a) => a.role === "admin") || {
            did: DEFAULT_ADMIN_DID,
            role: "admin" as Role,
            name: DEFAULT_ADMIN_NAME,
          };

        set({ user: { did: admin.did, role: "admin", name: admin.name } });
        return true;
      },

      logout: () => set({ user: null }),
    }),
    {
      name: "auth_store",
      partialize: (s) => ({ user: s.user }),
    }
  )
);
