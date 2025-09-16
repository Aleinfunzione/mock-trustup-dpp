import { create } from "zustand"
import type { User, Role } from "@/types/auth"
import { STORAGE_KEYS } from "@/utils/constants"
import { safeSet, safeGet } from "@/utils/storage"
import {
  deriveKeypairFromMnemonic,
  didFromPublicKey,
  isValidMnemonic,
  normalizeMnemonic,
} from "@/services/crypto/did"
import {
  ensureAdmin,
  getActor,
  upsertActor,
  getRegistry,
  saveRegistry,
} from "@/services/api/identity"
import type { IdentityRegistry } from "@/types/identity"

interface AuthState {
  currentUser: User | null
  loginSeed: (mnemonic: string, roleHint?: Role) => Promise<User>
  loginAdmin: (username: string, password: string) => Promise<User>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: safeGet<User | null>(STORAGE_KEYS.currentUser, null),

  async loginSeed(mnemonic, roleHint) {
    const norm = normalizeMnemonic(mnemonic ?? "")
    if (!norm) throw new Error("Inserisci una seed phrase valida")
    if (!isValidMnemonic(norm)) {
      throw new Error("Seed phrase non valida: usa una BIP-39 da 12 o 24 parole (inglese).")
    }

    const kp = await deriveKeypairFromMnemonic(norm)
    const did = didFromPublicKey(kp.publicKey)

    // Se l'attore non esiste, crealo con ruolo di default/hint
    let actor = getActor(did)
    if (!actor) {
      actor = upsertActor({
        did,
        role: roleHint ?? "creator",
        publicKey: kp.publicKey,
      })
    }

    // Fallback robusto: ricarica sempre l'attore dal registro (per avere companyDid aggiornato)
    const refreshed = getActor(did) ?? actor

    const user: User = {
      did,
      role: refreshed.role,
      publicKey: kp.publicKey,
      username: refreshed.username,
      companyDid: refreshed.companyDid,
    }

    safeSet(STORAGE_KEYS.currentUser, user)
    set({ currentUser: user })
    return user
  },

  async loginAdmin(username, password) {
    const ok = (username === "admin" && password === "admin") || (!!username && !!password)
    if (!ok) throw new Error("Credenziali non valide")

    const admin = ensureAdmin(username)

    const user: User = { did: admin.did, role: "admin", username: admin.username }
    safeSet(STORAGE_KEYS.currentUser, user)
    set({ currentUser: user })
    return user
  },

  logout() {
    safeSet<User | null>(STORAGE_KEYS.currentUser, null)
    set({ currentUser: null })

    // opzionale: reset se registry vuoto
    const reg = getRegistry()
    if (!Object.keys(reg.actors).length && !Object.keys(reg.companies).length) {
      saveRegistry({ actors: {}, companies: {}, seeds: {} } as IdentityRegistry)
    }
  },
}))
