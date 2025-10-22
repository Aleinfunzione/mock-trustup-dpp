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

export type Team = {
  id: string;
  name: string;
  companyDid: string;
  memberDids: string[];
};

export type PublicMember = {
  did: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  displayName: string;
  email?: string;
  companyDid?: string;
  username?: string;
  islandId?: string;
  group?: string;
};

/* ---------- storage keys locali ---------- */

const KEY_ISLANDS = "identity.islands";
const KEY_MEMBER_ISLANDS = "identity.memberIslands";
const KEY_TEAMS = "identity.teams";

/* ---------- helpers ---------- */

function emptyRegistry(): IdentityRegistry {
  return { actors: {}, companies: {}, seeds: {} };
}

function nowISO(): string {
  return new Date().toISOString();
}

function randomHex(bytes = 8): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  try {
    const c = (globalThis as any)?.crypto as Crypto | undefined;
    if (c?.getRandomValues) {
      const arr = new Uint8Array(bytes);
      c.getRandomValues(arr);
      return Array.from(arr).map((b) => toHex(b)).join("");
    }
  } catch {
    /* noop */
  }
  return Array.from({ length: bytes }, () => toHex(Math.floor(Math.random() * 256))).join("");
}

function isCompanyAssignableRole(
  role: Role
): role is Extract<Role, "creator" | "operator" | "machine"> {
  return role === "creator" || role === "operator" || role === "machine";
}

function toDisplayName(r: Pick<IdentityRecord, "did" | "username">): string {
  if (r.username && r.username.trim()) return r.username.trim();
  const short = r.did?.slice(-8) ?? "user";
  return `user-${short}`;
}

function splitName(username?: string): { firstName?: string; lastName?: string } {
  if (!username) return {};
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  return { firstName: username };
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

/* ---------- registry load/save ---------- */

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

/* ---------- Isole (compatibili con logica esistente) ---------- */

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

export function listIslands(companyDid: string): Island[] {
  return loadIslands().filter((i) => i.companyDid === companyDid);
}

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

export function removeIsland(islandId: string) {
  const list = loadIslands().filter((i) => i.id !== islandId);
  saveIslands(list);
  const map = loadMemberIslands().map((m) => (m.islandId === islandId ? { ...m, islandId: undefined } : m));
  saveMemberIslands(map);
}

export function getMemberIsland(did: string): MemberIsland | undefined {
  return loadMemberIslands().find((m) => m.did === did);
}

export function setMemberIsland(did: string, islandId?: string, group?: string): MemberIsland {
  const map = loadMemberIslands();
  const idx = map.findIndex((m) => m.did === did);
  const rec: MemberIsland = { did, islandId, group };
  if (idx >= 0) map[idx] = rec;
  else map.push(rec);
  saveMemberIslands(map);
  return rec;
}

/* ---------- Team (nuovo: CRUD + membership) ---------- */

function loadTeams(): Team[] {
  return safeGet<Team[]>(KEY_TEAMS, []);
}
function saveTeams(list: Team[]) {
  safeSet(KEY_TEAMS, list);
}

/** Elenco team; se companyDid è passato filtra per azienda */
export function listTeams(companyDid?: string): Team[] {
  const all = loadTeams();
  return companyDid ? all.filter((t) => t.companyDid === companyDid) : all;
}

/** Crea team */
export function createTeam(input: { name: string; companyDid: string }): Team {
  const id = `team_${randomHex(8)}`;
  const team: Team = { id, name: input.name, companyDid: input.companyDid, memberDids: [] };
  const list = loadTeams();
  list.push(team);
  saveTeams(list);
  return team;
}

/** Rinomina team */
export function renameTeam(teamId: string, name: string): Team {
  const list = loadTeams();
  const idx = list.findIndex((t) => t.id === teamId);
  if (idx < 0) throw new Error("Team non trovato");
  list[idx] = { ...list[idx], name };
  saveTeams(list);
  return list[idx];
}

/** Elimina team e rimuove membership */
export function deleteTeam(teamId: string) {
  const list = loadTeams();
  const filtered = list.filter((t) => t.id !== teamId);
  saveTeams(filtered);
}

/** Trova il team attuale di un membro (id) */
export function getMemberTeamId(memberDid: string): string | undefined {
  const list = loadTeams();
  return list.find((t) => t.memberDids.includes(memberDid))?.id;
}

/** Assegna un membro a un team. Passa null per rimuoverlo da ogni team. */
export function assignMemberToTeam(memberDid: string, teamId: string | null) {
  const list = loadTeams();
  // rimuovi da eventuale team precedente
  for (const t of list) {
    if (t.memberDids.includes(memberDid)) {
      t.memberDids = t.memberDids.filter((d) => d !== memberDid);
    }
  }
  // assegna al nuovo team
  if (teamId) {
    const t = list.find((x) => x.id === teamId);
    if (!t) throw new Error("Team non trovato");
    if (!t.memberDids.includes(memberDid)) t.memberDids.push(memberDid);
  }
  saveTeams(list);
}

/** Lista membri di un team come IdentityRecord */
export function listTeamMembers(teamId: string): IdentityRecord[] {
  const reg = getRegistry();
  const t = loadTeams().find((x) => x.id === teamId);
  if (!t) return [];
  return t.memberDids
    .map((did) => reg.actors[did])
    .filter((a): a is IdentityRecord => !!a);
}

/* ---------- companies ---------- */

export type CompanyInput = {
  name: string;
  details?: CompanyDetails;
};

export function createCompany(input: CompanyInput): Company {
  const { name, details } = input;
  const reg = getRegistry();
  const companyDid = `did:mock:cmp-${randomHex(6)}`;
  const company: Company = { companyDid, name, details, createdAt: nowISO() };
  reg.companies[companyDid] = company;
  saveRegistry(reg);
  return company;
}

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

  // pulizia team
  const remainingTeams = loadTeams().filter((t) => t.companyDid !== companyDid);
  saveTeams(remainingTeams);

  if (opts?.cascade) {
    for (const did of Object.keys(reg.actors)) {
      const a = reg.actors[did];
      if (a?.companyDid === companyDid) {
        delete reg.actors[did];
        if (reg.seeds) delete reg.seeds[did];
      }
    }
  } else {
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
  reg.seeds![did] = seed;
  saveRegistry(reg);

  return { record, seed };
}

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

export function listCompanyAccounts(): IdentityRecord[] {
  const reg = getRegistry();
  return Object.values(reg.actors).filter((a) => a.role === "company");
}

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
  reg.seeds![did] = seed;
  saveRegistry(reg);

  return { record, seed };
}

export function listCompanyMembers(companyDid: string): IdentityRecord[] {
  const reg = getRegistry();
  return Object.values(reg.actors).filter(
    (a) => a.companyDid === companyDid && a.role !== "company"
  );
}

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

/* ---------- interfacce richieste dalla UI ---------- */

export function listMembersByCompany(companyDid: string): PublicMember[] {
  const members = listCompanyMembers(companyDid).map(toPublicMember);
  return sortByRoleName(members);
}

export const listByCompany = listMembersByCompany;

export function listMembers(companyDid?: string): PublicMember[] {
  const reg = getRegistry();
  const all = Object.values(reg.actors).filter((a) => a.role !== "company");
  const filtered = companyDid ? all.filter((a) => a.companyDid === companyDid) : all;
  return sortByRoleName(filtered.map(toPublicMember));
}

export function listMembersByRole(companyDid: string, role: Extract<Role, "creator" | "operator" | "machine">): PublicMember[] {
  return listMembers(companyDid).filter((m) => m.role === role);
}

export const list = listMembers;
