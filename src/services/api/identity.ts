// src/services/api/identity.ts
import { STORAGE_KEYS } from "@/utils/constants";
import { safeGet, safeSet } from "@/utils/storage";
import type {
  IdentityRegistry,
  IdentityRecord,
  Company,
  CompanyDetails,
} from "@/types/identity";
import type { Role } from "@/types/auth";
import {
  deriveKeypairFromMnemonic,
  didFromPublicKey,
  generateMnemonic12,
} from "@/services/crypto/did";

/* ---------- nuovi tipi locali (scoped a questo file) ---------- */

export type Island = { id: string; name: string; companyDid: string; group?: string };
export type MemberIsland = { did: string; islandId?: string; group?: string };

/** Shape “profilo pubblico” richiesto dalla UI */
export type PublicMember = {
  did: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  displayName: string;
  email?: string;
  companyDid?: string;
  username?: string;
  /** mapping isola/gruppo per filtri UI */
  islandId?: string;
  group?: string;
};

/* ---------- storage keys locali per isole/mapping (no nuovi file) ---------- */

const KEY_ISLANDS = "identity.islands";
const KEY_MEMBER_ISLANDS = "identity.memberIslands";

/* ---------- helpers ---------- */

function emptyRegistry(): IdentityRegistry {
  return { actors: {}, companies: {}, seeds: {} };
}

function nowISO(): string {
  return new Date().toISOString();
}

function randomHex(bytes = 8): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isCompanyAssignableRole(
  role: Role
): role is Extract<Role, "creator" | "operator" | "machine"> {
  return role === "creator" || role === "operator" || role === "machine";
}

/** Deriva un display name semplice da username/did */
function toDisplayName(r: Pick<IdentityRecord, "did" | "username">): string {
  if (r.username && r.username.trim()) return r.username.trim();
  const short = r.did?.slice(-8) ?? "user";
  return `user-${short}`;
}

/** Prova a splittare nome e cognome dal username */
function splitName(username?: string): { firstName?: string; lastName?: string } {
  if (!username) return {};
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  return { firstName: username };
}

/** Costruisce il profilo pubblico richiesto dalla UI (merge con mapping isola) */
function toPublicMember(r: IdentityRecord): PublicMember {
  const displayName = toDisplayName(r);
  const { firstName, lastName } = splitName(r.username);
  const email =
    (r as any).email ??
    (r.username ? `${r.username.replace(/\s+/g, ".").toLowerCase()}@mock.local` : undefined);
  const map = getMemberIsland(r.did);
  return {
    did: r.did,
    role: r.role,
    firstName,
    lastName,
    displayName,
    email,
    companyDid: r.companyDid,
    username: r.username,
    islandId: map?.islandId,
    group: map?.group,
  };
}

function sortByRoleName<T extends { role: Role; displayName?: string; username?: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const rr = String(a.role).localeCompare(String(b.role));
    if (rr !== 0) return rr;
    const an = (a as any).displayName ?? a.username ?? "";
    const bn = (b as any).displayName ?? b.username ?? "";
    return String(an).localeCompare(String(bn));
  });
}

/* ---------- load/save (NORMALIZZATO) ---------- */

export function getRegistry(): IdentityRegistry {
  const reg = safeGet<IdentityRegistry>(STORAGE_KEYS.identityRegistry, emptyRegistry());
  const normalized: IdentityRegistry = {
    actors: reg.actors ?? {},
    companies: reg.companies ?? {},
    seeds: reg.seeds ?? {},
  };
  if (!reg.actors || !reg.companies || !reg.seeds) {
    safeSet(STORAGE_KEYS.identityRegistry, normalized);
  }
  return normalized;
}

export function saveRegistry(reg: IdentityRegistry): void {
  const normalized: IdentityRegistry = {
    actors: reg.actors ?? {},
    companies: reg.companies ?? {},
    seeds: reg.seeds ?? {},
  };
  safeSet(STORAGE_KEYS.identityRegistry, normalized);
}

/* ---------- gestione isole (storage separato, compatibile con tipi esistenti) ---------- */

function loadIslands(): Island[] {
  return safeGet<Island[]>(KEY_ISLANDS, []);
}
function saveIslands(list: Island[]) {
  safeSet(KEY_ISLANDS, list);
}
function loadMemberIslands(): MemberIsland[] {
  return safeGet<MemberIsland[]>(KEY_MEMBER_ISLANDS, []);
}
function saveMemberIslands(list: MemberIsland[]) {
  safeSet(KEY_MEMBER_ISLANDS, list);
}

/** Elenco isole dell'azienda */
export function listIslands(companyDid: string): Island[] {
  return loadIslands().filter((i) => i.companyDid === companyDid);
}

/** Crea/Aggiorna isola */
export function upsertIsland(
  input: Omit<Island, "id"> & Partial<Pick<Island, "id">>
): Island {
  const list = loadIslands();
  const id = input.id ?? `isl_${randomHex(5)}`;
  const next: Island = { id, name: input.name, companyDid: input.companyDid, group: input.group };
  const idx = list.findIndex((i) => i.id === id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  saveIslands(list);
  return next;
}

/** Elimina isola e sgancia i membri collegati */
export function removeIsland(islandId: string) {
  const list = loadIslands().filter((i) => i.id !== islandId);
  saveIslands(list);
  const map = loadMemberIslands().map((m) => (m.islandId === islandId ? { ...m, islandId: undefined } : m));
  saveMemberIslands(map);
}

/** Mapping: leggi associazione membro↔isola */
export function getMemberIsland(did: string): MemberIsland | undefined {
  return loadMemberIslands().find((m) => m.did === did);
}

/** Mapping: imposta associazione membro↔isola e gruppo opzionale */
export function setMemberIsland(did: string, islandId?: string, group?: string): MemberIsland {
  const map = loadMemberIslands();
  const idx = map.findIndex((m) => m.did === did);
  const rec: MemberIsland = { did, islandId, group };
  if (idx >= 0) map[idx] = rec;
  else map.push(rec);
  saveMemberIslands(map);
  return rec;
}

/* ---------- companies ---------- */

export type CompanyInput = {
  name: string;
  details?: CompanyDetails;
};

/** Crea solo la scheda azienda (senza account) */
export function createCompany(input: CompanyInput): Company {
  const { name, details } = input;
  const reg = getRegistry();
  const companyDid = `did:mock:cmp-${randomHex(6)}`;
  const company: Company = { companyDid, name, details, createdAt: nowISO() };
  reg.companies[companyDid] = company;
  saveRegistry(reg);
  return company;
}

/** Elimina azienda; se cascade=true elimina anche account Company, membri e relative seed (MOCK). */
export function deleteCompany(companyDid: string, opts?: { cascade?: boolean }) {
  const reg = getRegistry();
  if (!reg.companies[companyDid]) return;
  delete reg.companies[companyDid];

  // pulizia isole e mapping per quell'azienda
  const isl = loadIslands().filter((i) => i.companyDid !== companyDid);
  saveIslands(isl);
  const members = Object.values(reg.actors)
    .filter((a) => a.companyDid === companyDid)
    .map((a) => a.did);
  const map = loadMemberIslands().map((m) => (members.includes(m.did) ? { ...m, islandId: undefined } : m));
  saveMemberIslands(map);

  if (opts?.cascade) {
    for (const did of Object.keys(reg.actors)) {
      const a = reg.actors[did];
      if (a?.companyDid === companyDid) {
        delete reg.actors[did];
        if (reg.seeds) delete reg.seeds[did];
      }
    }
  } else {
    // unlink soft (mantiene gli attori ma senza appartenenza)
    for (const a of Object.values(reg.actors)) {
      if (a.companyDid === companyDid) a.companyDid = undefined;
    }
  }
  saveRegistry(reg);
}

/**
 * Crea l'account seed-based (ruolo 'company') per una company esistente.
 * Ritorna { record, seed } (12 parole, MOCK).
 */
export async function createCompanyAccount(
  companyDid: string,
  username?: string
): Promise<{ record: IdentityRecord; seed: string }> {
  const reg = getRegistry();
  if (!reg.companies[companyDid]) throw new Error("Azienda inesistente");

  const seed = generateMnemonic12();
  const kp = await deriveKeypairFromMnemonic(seed);
  const did = didFromPublicKey(kp.publicKey);

  const record: IdentityRecord = {
    did,
    role: "company",
    username: username ?? `company-admin-${companyDid.slice(-6)}`,
    publicKey: kp.publicKey,
    companyDid,
  };

  reg.actors[did] = record;
  reg.seeds![did] = seed; // MOCK: archivio seed
  saveRegistry(reg);

  return { record, seed };
}

/** Convenience: crea company + account company in un colpo solo */
export async function createCompanyWithAccount(
  input: CompanyInput,
  username?: string
): Promise<{ company: Company; account: IdentityRecord; seed: string }> {
  const company = createCompany(input);
  const { record, seed } = await createCompanyAccount(company.companyDid, username);
  return { company, account: record, seed };
}

export function getCompany(companyDid: string): Company | undefined {
  const reg = getRegistry();
  return reg.companies[companyDid];
}

export function listCompanies(): Company[] {
  const reg = getRegistry();
  return Object.values(reg.companies);
}

/** Lista di tutti gli account con ruolo 'company' */
export function listCompanyAccounts(): IdentityRecord[] {
  const reg = getRegistry();
  return Object.values(reg.actors).filter((a) => a.role === "company");
}

/** Ritorna tutte le seed degli account company presenti (MOCK) */
export function listCompanyAccountsWithSeeds(): Array<{
  did: string;
  companyDid?: string;
  username?: string;
  seed?: string;
}> {
  const accounts = listCompanyAccounts();
  const reg = getRegistry();
  return accounts.map((a) => ({
    did: a.did,
    companyDid: a.companyDid,
    username: a.username,
    seed: reg.seeds?.[a.did],
  }));
}

/* ---------- actors (interni alle aziende) ---------- */

export function getActor(did: string): IdentityRecord | undefined {
  const reg = getRegistry();
  return reg.actors[did];
}

/** Profilo pubblico di un attore */
export function getPublicMember(did: string): PublicMember | undefined {
  const a = getActor(did);
  return a ? toPublicMember(a) : undefined;
}

export function upsertActor(record: IdentityRecord): IdentityRecord {
  const reg = getRegistry();
  reg.actors[record.did] = { ...reg.actors[record.did], ...record };
  saveRegistry(reg);
  return reg.actors[record.did];
}

export function setActorRole(did: string, role: Role): IdentityRecord {
  const reg = getRegistry();
  const current = reg.actors[did];
  if (!current) throw new Error(`Actor ${did} non trovato`);
  reg.actors[did] = { ...current, role };
  saveRegistry(reg);
  return reg.actors[did];
}

export function listActorsByRole(role: Role): IdentityRecord[] {
  const reg = getRegistry();
  return Object.values(reg.actors).filter((a) => a.role === role);
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
  const reg = getRegistry();
  if (!reg.companies[companyDid]) throw new Error("Azienda inesistente");
  if (!isCompanyAssignableRole(role)) throw new Error("Ruolo non consentito: usa creator/operator/machine");

  const seed = generateMnemonic12();
  const kp = await deriveKeypairFromMnemonic(seed);
  const did = didFromPublicKey(kp.publicKey);

  const record: IdentityRecord = { did, role, username, publicKey: kp.publicKey, companyDid };
  reg.actors[did] = record;
  reg.seeds![did] = seed; // MOCK: conserva mnemonica per recupero
  saveRegistry(reg);

  return { record, seed };
}

export function listCompanyMembers(companyDid: string): IdentityRecord[] {
  const reg = getRegistry();
  return Object.values(reg.actors).filter(
    (a) => a.companyDid === companyDid && a.role !== "company"
  );
}

/** Seed dei membri di un'azienda (MOCK) */
export function listCompanyMemberSeeds(
  companyDid: string
): Array<{ did: string; role: Role; username?: string; seed?: string }> {
  const reg = getRegistry();
  const members = listCompanyMembers(companyDid);
  return members.map((m) => ({
    did: m.did,
    role: m.role,
    username: m.username,
    seed: reg.seeds?.[m.did],
  }));
}

/** Collega un attore esistente (DID) all'azienda */
export function linkUserToCompany(userDid: string, companyDid: string): IdentityRecord {
  const reg = getRegistry();
  if (!reg.companies[companyDid]) throw new Error("Azienda inesistente");
  const actor = reg.actors[userDid];
  if (!actor) throw new Error("Utente inesistente");
  reg.actors[userDid] = { ...actor, companyDid };
  saveRegistry(reg);
  return reg.actors[userDid];
}

/* ---------- admin helper ---------- */

export function ensureAdmin(username = "admin"): IdentityRecord {
  const reg = getRegistry();
  const did = "did:mock:admin";
  if (!reg.actors[did]) {
    reg.actors[did] = { did, role: "admin", username };
    saveRegistry(reg);
  }
  return reg.actors[did];
}

/* ---------- interfacce richieste dalla UI: fallback list* ---------- */

/** Profili membri di un’azienda con shape public richiesto */
export function listMembersByCompany(companyDid: string): PublicMember[] {
  const members = listCompanyMembers(companyDid).map(toPublicMember);
  return sortByRoleName(members);
}

/** Alias comodo */
export const listByCompany = listMembersByCompany;

/** Elenco profili membri; se companyDid è omesso ritorna tutti i membri non-company */
export function listMembers(companyDid?: string): PublicMember[] {
  const reg = getRegistry();
  const all = Object.values(reg.actors).filter((a) => a.role !== "company");
  const filtered = companyDid ? all.filter((a) => a.companyDid === companyDid) : all;
  return sortByRoleName(filtered.map(toPublicMember));
}

/** Alias generico chiesto dalla UI */
export const list = listMembers;
