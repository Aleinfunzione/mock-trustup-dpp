import { STORAGE_KEYS } from "@/utils/constants"
import { safeGet, safeSet } from "@/utils/storage"
import type { IdentityRegistry, IdentityRecord, Company, CompanyDetails } from "@/types/identity"
import type { Role } from "@/types/auth"
import { deriveKeypairFromMnemonic, didFromPublicKey, generateMnemonic12 } from "@/services/crypto/did"

/* ---------- helpers ---------- */

function emptyRegistry(): IdentityRegistry {
  return { actors: {}, companies: {}, seeds: {} }
}

function nowISO(): string {
  return new Date().toISOString()
}

function randomHex(bytes = 8): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("")
}

function isCompanyAssignableRole(role: Role): role is Extract<Role, "creator" | "operator" | "machine"> {
  return role === "creator" || role === "operator" || role === "machine"
}

/* ---------- load/save (NORMALIZZATO) ---------- */

export function getRegistry(): IdentityRegistry {
  const reg = safeGet<IdentityRegistry>(STORAGE_KEYS.identityRegistry, emptyRegistry())
  const normalized: IdentityRegistry = {
    actors: reg.actors ?? {},
    companies: reg.companies ?? {},
    seeds: reg.seeds ?? {},
  }
  if (!reg.actors || !reg.companies || !reg.seeds) {
    safeSet(STORAGE_KEYS.identityRegistry, normalized)
  }
  return normalized
}

export function saveRegistry(reg: IdentityRegistry): void {
  const normalized: IdentityRegistry = {
    actors: reg.actors ?? {},
    companies: reg.companies ?? {},
    seeds: reg.seeds ?? {},
  }
  safeSet(STORAGE_KEYS.identityRegistry, normalized)
}

/* ---------- companies ---------- */

export type CompanyInput = {
  name: string
  details?: CompanyDetails
}

/** Crea solo la scheda azienda (senza account) */
export function createCompany(input: CompanyInput): Company {
  const { name, details } = input
  const reg = getRegistry()
  const companyDid = `did:mock:cmp-${randomHex(6)}`
  const company: Company = { companyDid, name, details, createdAt: nowISO() }
  reg.companies[companyDid] = company
  saveRegistry(reg)
  return company
}

/** Elimina azienda; se cascade=true elimina anche account Company, membri e relative seed (MOCK). */
export function deleteCompany(companyDid: string, opts?: { cascade?: boolean }) {
  const reg = getRegistry()
  if (!reg.companies[companyDid]) return
  delete reg.companies[companyDid]

  if (opts?.cascade) {
    for (const did of Object.keys(reg.actors)) {
      const a = reg.actors[did]
      if (a?.companyDid === companyDid) {
        delete reg.actors[did]
        if (reg.seeds) delete reg.seeds[did]
      }
    }
  } else {
    // unlink soft (mantiene gli attori ma senza appartenenza)
    for (const a of Object.values(reg.actors)) {
      if (a.companyDid === companyDid) a.companyDid = undefined
    }
  }
  saveRegistry(reg)
}

/**
 * Crea l'account seed-based (ruolo 'company') per una company esistente.
 * Ritorna { record, seed } (12 parole, MOCK).
 */
export async function createCompanyAccount(
  companyDid: string,
  username?: string
): Promise<{ record: IdentityRecord; seed: string }> {
  const reg = getRegistry()
  if (!reg.companies[companyDid]) throw new Error("Azienda inesistente")

  const seed = generateMnemonic12()
  const kp = await deriveKeypairFromMnemonic(seed)
  const did = didFromPublicKey(kp.publicKey)

  const record: IdentityRecord = {
    did,
    role: "company",
    username: username ?? `company-admin-${companyDid.slice(-6)}`,
    publicKey: kp.publicKey,
    companyDid,
  }

  reg.actors[did] = record
  reg.seeds![did] = seed // MOCK: archivio seed
  saveRegistry(reg)

  return { record, seed }
}

/** Convenience: crea company + account company in un colpo solo */
export async function createCompanyWithAccount(
  input: CompanyInput,
  username?: string
): Promise<{ company: Company; account: IdentityRecord; seed: string }> {
  const company = createCompany(input)
  const { record, seed } = await createCompanyAccount(company.companyDid, username)
  return { company, account: record, seed }
}

export function getCompany(companyDid: string): Company | undefined {
  const reg = getRegistry()
  return reg.companies[companyDid]
}

export function listCompanies(): Company[] {
  const reg = getRegistry()
  return Object.values(reg.companies)
}

/** Lista di tutti gli account con ruolo 'company' */
export function listCompanyAccounts(): IdentityRecord[] {
  const reg = getRegistry()
  return Object.values(reg.actors).filter(a => a.role === "company")
}

/** Ritorna tutte le seed degli account company presenti (MOCK) */
export function listCompanyAccountsWithSeeds(): Array<{ did: string; companyDid?: string; username?: string; seed?: string }> {
  const accounts = listCompanyAccounts()
  const reg = getRegistry()
  return accounts.map(a => ({ did: a.did, companyDid: a.companyDid, username: a.username, seed: reg.seeds?.[a.did] }))
}

/* ---------- actors (interni alle aziende) ---------- */

export function getActor(did: string): IdentityRecord | undefined {
  const reg = getRegistry()
  return reg.actors[did]
}

export function upsertActor(record: IdentityRecord): IdentityRecord {
  const reg = getRegistry()
  reg.actors[record.did] = { ...reg.actors[record.did], ...record }
  saveRegistry(reg)
  return reg.actors[record.did]
}

export function setActorRole(did: string, role: Role): IdentityRecord {
  const reg = getRegistry()
  const current = reg.actors[did]
  if (!current) throw new Error(`Actor ${did} non trovato`)
  reg.actors[did] = { ...current, role }
  saveRegistry(reg)
  return reg.actors[did]
}

export function listActorsByRole(role: Role): IdentityRecord[] {
  const reg = getRegistry()
  return Object.values(reg.actors).filter(a => a.role === role)
}

/**
 * Crea un attore interno (creator/operator/machine) con seed BIP-39 (MOCK).
 * Ritorna { record, seed } da consegnare al membro.
 */
export async function createInternalActor(
  companyDid: string,
  role: Role,
  username?: string
): Promise<{ record: IdentityRecord; seed: string }> {
  const reg = getRegistry()
  if (!reg.companies[companyDid]) throw new Error("Azienda inesistente")
  if (!isCompanyAssignableRole(role)) throw new Error("Ruolo non consentito: usa creator/operator/machine")

  const seed = generateMnemonic12()
  const kp = await deriveKeypairFromMnemonic(seed)
  const did = didFromPublicKey(kp.publicKey)

  const record: IdentityRecord = { did, role, username, publicKey: kp.publicKey, companyDid }
  reg.actors[did] = record
  reg.seeds![did] = seed // MOCK: conserva mnemonica per recupero
  saveRegistry(reg)

  return { record, seed }
}

export function listCompanyMembers(companyDid: string): IdentityRecord[] {
  const reg = getRegistry()
  return Object.values(reg.actors).filter(a => a.companyDid === companyDid && a.role !== "company")
}

/** Seed dei membri di un'azienda (MOCK) */
export function listCompanyMemberSeeds(companyDid: string): Array<{ did: string; role: Role; username?: string; seed?: string }> {
  const reg = getRegistry()
  const members = listCompanyMembers(companyDid)
  return members.map(m => ({ did: m.did, role: m.role, username: m.username, seed: reg.seeds?.[m.did] }))
}

/** Collega un attore esistente (DID) all'azienda */
export function linkUserToCompany(userDid: string, companyDid: string): IdentityRecord {
  const reg = getRegistry()
  if (!reg.companies[companyDid]) throw new Error("Azienda inesistente")
  const actor = reg.actors[userDid]
  if (!actor) throw new Error("Utente inesistente")
  reg.actors[userDid] = { ...actor, companyDid }
  saveRegistry(reg)
  return reg.actors[userDid]
}

/* ---------- admin helper ---------- */

export function ensureAdmin(username = "admin"): IdentityRecord {
  const reg = getRegistry()
  const did = "did:mock:admin"
  if (!reg.actors[did]) {
    reg.actors[did] = { did, role: "admin", username }
    saveRegistry(reg)
  }
  return reg.actors[did]
}
