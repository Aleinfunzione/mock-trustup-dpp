// src/stores/orgStore.ts
// Mapping attori ↔ isole per azienda, con macro-gruppi opzionali.
// Persistenza: localStorage per companyDid.
// Non dipende da IdentityApi: le UI combinano members esterni + assignments qui.

export type Island = {
  id: string;            // slug/uuid
  name: string;
  description?: string;
  updatedAt: string;
};

export type MemberAssignment = {
  did: string;           // actor DID
  islandId?: string;     // undefined/null => non assegnato
  group?: string;        // macro-gruppo libero (es. "Linea A", "Turno 1")
  updatedAt: string;
};

type IslandsIndex = Record<string, Island>;          // by islandId
type AssignIndex = Record<string, MemberAssignment>; // by did

const NS = "trustup:org";

function keyIslands(companyDid: string) { return `${NS}:${companyDid}:islands`; }
function keyAssign(companyDid: string) { return `${NS}:${companyDid}:assign`; }

function readJSON<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJSON(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function nowISO() { return new Date().toISOString(); }

/* -------- Islands CRUD -------- */
export function listIslands(companyDid: string): Island[] {
  const idx = readJSON<IslandsIndex>(keyIslands(companyDid), {});
  return Object.values(idx).sort((a, b) => a.name.localeCompare(b.name));
}

export function getIsland(companyDid: string, islandId: string): Island | undefined {
  const idx = readJSON<IslandsIndex>(keyIslands(companyDid), {});
  return idx[islandId];
}

export function upsertIsland(companyDid: string, island: { id: string; name: string; description?: string }) {
  const k = keyIslands(companyDid);
  const idx = readJSON<IslandsIndex>(k, {});
  idx[island.id] = { ...idx[island.id], ...island, updatedAt: nowISO() };
  writeJSON(k, idx);
  return idx[island.id];
}

export function removeIsland(companyDid: string, islandId: string) {
  const kI = keyIslands(companyDid);
  const islands = readJSON<IslandsIndex>(kI, {});
  if (islands[islandId]) {
    delete islands[islandId];
    writeJSON(kI, islands);
  }
  // rimuovi assegnazioni a quell'isola
  const kA = keyAssign(companyDid);
  const asg = readJSON<AssignIndex>(kA, {});
  let changed = false;
  for (const did of Object.keys(asg)) {
    if (asg[did]?.islandId === islandId) {
      asg[did] = { ...asg[did], islandId: undefined, updatedAt: nowISO() };
      changed = true;
    }
  }
  if (changed) writeJSON(kA, asg);
}

/* -------- Assignments -------- */
export function listAssignments(companyDid: string): MemberAssignment[] {
  const idx = readJSON<AssignIndex>(keyAssign(companyDid), {});
  return Object.values(idx);
}

export function getAssignment(companyDid: string, did: string): MemberAssignment | undefined {
  const idx = readJSON<AssignIndex>(keyAssign(companyDid), {});
  return idx[did];
}

export function setMemberIsland(
  companyDid: string,
  did: string,
  islandId: string | undefined | null,
  group?: string
): MemberAssignment {
  const k = keyAssign(companyDid);
  const idx = readJSON<AssignIndex>(k, {});
  const next: MemberAssignment = {
    did,
    islandId: islandId || undefined,
    group: group?.trim() || undefined,
    updatedAt: nowISO(),
  };
  idx[did] = next;
  writeJSON(k, idx);
  return next;
}

export function clearMemberAssignment(companyDid: string, did: string) {
  const k = keyAssign(companyDid);
  const idx = readJSON<AssignIndex>(k, {});
  if (idx[did]) {
    delete idx[did];
    writeJSON(k, idx);
  }
}

/* -------- Queries utili per UI -------- */
export function membersByIsland(companyDid: string): Record<string, string[]> {
  // ritorna mappa islandId -> array di did
  const asg = readJSON<AssignIndex>(keyAssign(companyDid), {});
  const out: Record<string, string[]> = {};
  for (const a of Object.values(asg)) {
    const id = a.islandId || "__unassigned__";
    (out[id] ||= []).push(a.did);
  }
  return out;
}

export function groupsForIsland(companyDid: string, islandId: string): string[] {
  const asg = readJSON<AssignIndex>(keyAssign(companyDid), {});
  const set = new Set<string>();
  for (const a of Object.values(asg)) {
    if (a.islandId === islandId && a.group) set.add(a.group);
  }
  return Array.from(set).sort();
}

export function reassignGroup(
  companyDid: string,
  islandId: string,
  fromGroup: string | undefined,
  toGroup: string | undefined,
  dids?: string[]
) {
  const k = keyAssign(companyDid);
  const idx = readJSON<AssignIndex>(k, {});
  const target = new Set(dids || Object.keys(idx));
  let changed = false;
  for (const [did, a] of Object.entries(idx)) {
    if (!target.has(did)) continue;
    if (a.islandId !== islandId) continue;
    const matchFrom = (fromGroup ?? undefined) === (a.group ?? undefined);
    if (!matchFrom) continue;
    idx[did] = { ...a, group: toGroup?.trim() || undefined, updatedAt: nowISO() };
    changed = true;
  }
  if (changed) writeJSON(k, idx);
}

/* -------- Helpers diagnostica -------- */
export function __resetOrg(companyDid: string) {
  writeJSON(keyIslands(companyDid), {});
  writeJSON(keyAssign(companyDid), {});
}
