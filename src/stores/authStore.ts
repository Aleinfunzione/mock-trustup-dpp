// src/stores/authStore.ts
import { create } from "zustand";
import type { User, Role } from "@/types/auth";
import { STORAGE_KEYS } from "@/utils/constants";
import { safeSet, safeGet, safeExists, safeRemove } from "@/utils/storage";
import {
  deriveKeypairFromMnemonic,
  didFromPublicKey,
  isValidMnemonic,
  normalizeMnemonic,
} from "@/services/crypto/did";
import {
  ensureAdmin,
  getActor,
  upsertActor,
  getRegistry,
  saveRegistry,
  listCompanyMembers,
} from "@/services/api/identity";
import type { IdentityRegistry } from "@/types/identity";
import * as creditStore from "@/stores/creditStore";

/* ---------------- helpers bootstrap/migration ---------------- */

function nowISO(): string {
  return new Date().toISOString();
}

function markSeeded(companyDid: string): void {
  const meta = safeGet<Record<string, any>>(STORAGE_KEYS.CREDITS_META, {});
  meta[`seeded:${companyDid}`] = meta[`seeded:${companyDid}`] || nowISO();
  safeSet(STORAGE_KEYS.CREDITS_META, meta);
}
function isSeeded(companyDid: string): boolean {
  const meta = safeGet<Record<string, any>>(STORAGE_KEYS.CREDITS_META, {});
  return Boolean(meta[`seeded:${companyDid}`]);
}

/** Migrazione chiavi legacy → nuove CREDITS_* */
function migrateLegacyCredits(): void {
  try {
    // Se esiste un vecchio ledger, provalo a copiare in CREDITS_TX se vuoto.
    const legacy = safeGet<any>(STORAGE_KEYS.creditsLedger, null);
    const hasNew =
      safeExists(STORAGE_KEYS.CREDITS_ACCOUNTS) ||
      safeExists(STORAGE_KEYS.CREDITS_TX) ||
      safeExists(STORAGE_KEYS.CREDITS_META);

    if (legacy && !hasNew) {
      const tx = Array.isArray(legacy) ? legacy : [];
      safeSet(STORAGE_KEYS.CREDITS_TX, tx);
      safeSet(STORAGE_KEYS.CREDITS_ACCOUNTS, {}); // inizializza vuoto
      safeSet(STORAGE_KEYS.CREDITS_META, { migratedFrom: "creditsLedger", at: nowISO() });
    }
    // rimuovi il vecchio ledger per evitare confusione
    safeRemove(STORAGE_KEYS.creditsLedger);
  } catch {
    // noop
  }
}

/** Bootstrap crediti idempotente per azienda + membri correnti */
async function bootstrapCreditsForUser(u: User | null): Promise<void> {
  if (!u) return;
  const companyDid = u.companyDid ?? u.did;
  if (!companyDid) return;
  if (isSeeded(companyDid)) return;

  // raccogli admin, company e membri
  const adminDid = "did:mock:admin";
  const members = listCompanyMembers(companyDid).map((m) => m.did);

  const init = (creditStore as any)?.initCredits;
  if (typeof init !== "function") {
    markSeeded(companyDid); // evita ripetizioni anche se lo store non espone init
    return;
  }

  try {
    await Promise.resolve(
      init({
        adminDid,
        companyDid,
        members,
      })
    );
  } catch {
    // best-effort
  } finally {
    markSeeded(companyDid);
  }
}

/* ---------------- stato auth ---------------- */

const initialUser = safeGet<User | null>(STORAGE_KEYS.currentUser, null);
// migrazione una tantum all'import del modulo
migrateLegacyCredits();
// bootstrap lazy sull’utente già loggato
void bootstrapCreditsForUser(initialUser);

interface AuthState {
  currentUser: User | null;
  loginSeed: (mnemonic: string, roleHint?: Role) => Promise<User>;
  loginAdmin: (username: string, password: string) => Promise<User>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: initialUser,

  async loginSeed(mnemonic, roleHint) {
    const norm = normalizeMnemonic(mnemonic ?? "");
    if (!norm) throw new Error("Inserisci una seed phrase valida");
    if (!isValidMnemonic(norm)) {
      throw new Error("Seed phrase non valida: usa una BIP-39 da 12 o 24 parole (inglese).");
    }

    const kp = await deriveKeypairFromMnemonic(norm);
    const did = didFromPublicKey(kp.publicKey);

    // Se l'attore non esiste, crealo con ruolo di default/hint
    let actor = getActor(did);
    if (!actor) {
      actor = upsertActor({
        did,
        role: roleHint ?? "creator",
        publicKey: kp.publicKey,
      });
    }

    // Fallback robusto: ricarica sempre l'attore dal registro (per avere companyDid aggiornato)
    const refreshed = getActor(did) ?? actor;

    const user: User = {
      did,
      role: refreshed.role,
      publicKey: kp.publicKey,
      username: refreshed.username,
      companyDid: refreshed.companyDid,
    };

    safeSet(STORAGE_KEYS.currentUser, user);
    set({ currentUser: user });

    // bootstrap crediti idempotente
    await bootstrapCreditsForUser(user);

    return user;
  },

  async loginAdmin(username, password) {
    const ok = (username === "admin" && password === "admin") || (!!username && !!password);
    if (!ok) throw new Error("Credenziali non valide");

    const admin = ensureAdmin(username);

    const user: User = { did: admin.did, role: "admin", username: admin.username };
    safeSet(STORAGE_KEYS.currentUser, user);
    set({ currentUser: user });

    // bootstrap crediti idempotente per admin-as-company
    await bootstrapCreditsForUser(user);

    return user;
  },

  logout() {
    safeSet<User | null>(STORAGE_KEYS.currentUser, null);
    set({ currentUser: null });

    // opzionale: reset se registry vuoto
    const reg = getRegistry();
    if (!Object.keys(reg.actors).length && !Object.keys(reg.companies).length) {
      saveRegistry({ actors: {}, companies: {}, seeds: {} } as IdentityRegistry);
    }
  },
}));
