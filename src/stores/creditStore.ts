// src/stores/creditStore.ts
import {
  PRICE_TABLE,
  SPONSORSHIP,
  getActionCost,
  ADMIN_INITIAL_CREDITS,
  COMPANY_DEFAULT_CREDITS,
  LOW_BALANCE_THRESHOLD,
  CHARGE_POLICY,
} from "@/config/creditPolicy";
import type { ChargePolicy as ChargePolicyCfg } from "@/config/creditPolicy";
import type {
  AccountOwnerType,
  CreditAction,
  CreditAccount,
  CreditTx,
  SponsorshipRule,
  ConsumeActor,
  ConsumeResult,
  ConsumeResultOk,
} from "@/types/credit";
import { STORAGE_KEYS } from "@/utils/constants";

/* ============================ Policy (config) ============================ */

const DEFAULT_POLICY: ChargePolicyCfg = {
  preferIsland: true,
  preferActor: true,
  fallbackOrder: ["actor", "company", "admin"],
};
export function getChargePolicy(): Required<ChargePolicyCfg> {
  const raw = (CHARGE_POLICY ?? {}) as Partial<ChargePolicyCfg>;
  const fp = raw.fallbackOrder?.length ? raw.fallbackOrder : DEFAULT_POLICY.fallbackOrder;
  return {
    preferIsland: raw.preferIsland ?? DEFAULT_POLICY.preferIsland!,
    preferActor: raw.preferActor ?? DEFAULT_POLICY.preferActor!,
    fallbackOrder: fp as Array<"actor" | "company" | "admin">,
  };
}

/* ============================ Storage schema ============================ */

type AccountsIndex = Record<string, CreditAccount>;
type Meta = { version: number; counter: number };
type IslandBuckets = Record<string /*companyId*/, Record<string /*islandId*/, number /*credits*/>>;

const KEYS = {
  ACCOUNTS: (STORAGE_KEYS as any)?.CREDITS_ACCOUNTS ?? "trustup:credits:accounts",
  TX: (STORAGE_KEYS as any)?.CREDITS_TX ?? "trustup:credits:tx",
  META: (STORAGE_KEYS as any)?.CREDITS_META ?? "trustup:credits:meta",
  ISLAND_BUCKETS: "trustup:credits:islandBuckets",
};

/* ============================ Utils ============================ */

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function nowISO() {
  return new Date().toISOString();
}
function loadAccounts(): AccountsIndex {
  return readJSON<AccountsIndex>(KEYS.ACCOUNTS, {});
}
function loadTx(): CreditTx[] {
  return readJSON<CreditTx[]>(KEYS.TX, []);
}
function loadMeta(): Meta {
  return readJSON<Meta>(KEYS.META, { version: 0, counter: 0 });
}
function saveAll(nextAccounts: AccountsIndex, nextTx: CreditTx[], prevMeta?: Meta) {
  const meta = loadMeta();
  if (prevMeta && meta.version !== prevMeta.version) return false;
  writeJSON(KEYS.ACCOUNTS, nextAccounts);
  writeJSON(KEYS.TX, nextTx);
  const nextMeta: Meta = { version: meta.version + 1, counter: meta.counter };
  writeJSON(KEYS.META, nextMeta);
  return true;
}
function bumpCounter(): number {
  const meta = loadMeta();
  const next: Meta = { version: meta.version, counter: meta.counter + 1 };
  writeJSON(KEYS.META, next);
  return next.counter;
}
function txId(prefix = "tx"): string {
  return `${prefix}_${Date.now()}_${bumpCounter()}`;
}
function round6(n: number) {
  return Math.round((n + Number.EPSILON) * 1e6) / 1e6;
}

/* ====================== Island bucket helpers ====================== */

function loadIslandBuckets(): IslandBuckets {
  return readJSON<IslandBuckets>(KEYS.ISLAND_BUCKETS, {});
}
function saveIslandBuckets(b: IslandBuckets) {
  writeJSON(KEYS.ISLAND_BUCKETS, b);
}
export function getIslandBudget(companyId: string, islandId: string): number {
  const b = loadIslandBuckets();
  return b[companyId]?.[islandId] ?? 0;
}
export function setIslandBudget(companyId: string, islandId: string, amount: number) {
  if (!(Number.isFinite(amount) && amount >= 0)) throw new Error("amount non valido");
  const b = loadIslandBuckets();
  if (!b[companyId]) b[companyId] = {};
  b[companyId][islandId] = round6(amount);
  saveIslandBuckets(b);
}
export function addToIslandBudget(companyId: string, islandId: string, delta: number) {
  const cur = getIslandBudget(companyId, islandId);
  const next = cur + delta;
  if (next < 0) throw new Error("budget isola insufficiente");
  setIslandBudget(companyId, islandId, round6(next));
}

/* ============================ Identity helpers ============================ */

export function getAccountId(ownerType: AccountOwnerType, ownerId: string): string {
  return `acc:${ownerType}:${ownerId}`;
}
function getAdminAccountId(): string | undefined {
  const accounts = loadAccounts();
  const admin = Object.values(accounts).find((a) => a.ownerType === "admin");
  return admin?.id;
}
function mustAccount(id: string): CreditAccount {
  const acc = loadAccounts()[id];
  if (!acc) throw new Error(`Account non trovato: ${id}`);
  return acc;
}
function splitAccountId(accId: string): { ownerType?: AccountOwnerType; ownerId?: string } {
  const parts = accId?.split(":");
  if (parts?.length === 3) return { ownerType: parts[1] as AccountOwnerType, ownerId: parts[2] };
  return {};
}
function findMemberAccount(ownerId: string): string | undefined {
  const accs = loadAccounts();
  for (const a of Object.values(accs)) {
    if (a.ownerId === ownerId && a.ownerType !== "company" && a.ownerType !== "admin") return a.id;
  }
  return undefined;
}

/* ========================= Low-balance watcher ========================= */

type LowBalanceEvent = { accountId: string; balance: number; threshold: number; ts: string };
const lowBalanceWatchers = new Set<(e: LowBalanceEvent) => void>();
export function onLowBalance(cb: (e: LowBalanceEvent) => void) {
  lowBalanceWatchers.add(cb);
  return () => lowBalanceWatchers.delete(cb);
}
function maybeNotifyLow(acc: CreditAccount, ts: string) {
  const thr = acc.lowBalanceThreshold ?? LOW_BALANCE_THRESHOLD;
  if (acc.balance <= thr) {
    lowBalanceWatchers.forEach((fn) => fn({ accountId: acc.id, balance: acc.balance, threshold: thr, ts }));
  }
}

/* ===================== Bootstrap / ensure accounts ===================== */

export function initCredits(ctx: {
  adminId: string;
  companyId?: string;
  members?: { type: AccountOwnerType; id: string }[];
  adminSeed?: number;
  companyDefault?: number;
  defaultThreshold?: number;
}): { created: string[] } {
  const accounts = loadAccounts();
  const tx = loadTx();
  const prevMeta = loadMeta();
  const created: string[] = [];

  const seed = Number.isInteger(ctx.adminSeed) ? (ctx.adminSeed as number) : ADMIN_INITIAL_CREDITS;
  const companyInit = Number.isInteger(ctx.companyDefault)
    ? (ctx.companyDefault as number)
    : COMPANY_DEFAULT_CREDITS;
  const threshold = Number.isInteger(ctx.defaultThreshold)
    ? (ctx.defaultThreshold as number)
    : LOW_BALANCE_THRESHOLD;

  const ensureOne = (ownerType: AccountOwnerType, ownerId: string, initialBalance = 0) => {
    const id = getAccountId(ownerType, ownerId);
    if (!accounts[id]) {
      accounts[id] = {
        id,
        ownerType,
        ownerId,
        balance: initialBalance,
        lowBalanceThreshold: threshold,
        updatedAt: nowISO(),
      };
      created.push(id);
    }
  };

  ensureOne("admin", ctx.adminId, seed);
  if (ctx.companyId) ensureOne("company", ctx.companyId, companyInit);
  (ctx.members ?? []).forEach((m) => ensureOne(m.type, m.id, 0));

  const ok = saveAll(accounts, tx, prevMeta);
  if (!ok) saveAll(accounts, tx);
  return { created };
}

export function ensureCompanyAccount(
  companyId: string,
  initialBalance = COMPANY_DEFAULT_CREDITS,
  threshold = LOW_BALANCE_THRESHOLD
) {
  const accounts = loadAccounts();
  const tx = loadTx();
  const prevMeta = loadMeta();
  const id = getAccountId("company", companyId);
  if (!accounts[id]) {
    accounts[id] = {
      id,
      ownerType: "company",
      ownerId: companyId,
      balance: initialBalance,
      lowBalanceThreshold: threshold,
      updatedAt: nowISO(),
    };
    const ok = saveAll(accounts, tx, prevMeta);
    if (!ok) saveAll(accounts, tx);
  }
}

export function ensureMemberAccount(
  ownerType: AccountOwnerType,
  ownerId: string,
  initialBalance = 0,
  threshold = LOW_BALANCE_THRESHOLD
) {
  const accounts = loadAccounts();
  const tx = loadTx();
  const prevMeta = loadMeta();
  const id = getAccountId(ownerType, ownerId);
  if (!accounts[id]) {
    accounts[id] = {
      id,
      ownerType,
      ownerId,
      balance: initialBalance,
      lowBalanceThreshold: threshold,
      updatedAt: nowISO(),
    };
    const ok = saveAll(accounts, tx, prevMeta);
    if (!ok) saveAll(accounts, tx);
  }
  return id;
}

export function ensureAccounts(seed: {
  adminId: string;
  companyIds: string[];
  memberIds: { type: AccountOwnerType; id: string }[];
  defaults?: { balance?: number; threshold?: number };
}): void {
  let accounts = loadAccounts();
  const tx = loadTx();
  const meta = loadMeta();

  const { adminId, companyIds, memberIds, defaults } = seed;
  const defBalance = defaults?.balance ?? 0;
  const defThreshold = defaults?.threshold ?? LOW_BALANCE_THRESHOLD;

  const addIfMissing = (ownerType: AccountOwnerType, ownerId: string, initial = defBalance) => {
    const id = getAccountId(ownerType, ownerId);
    if (!accounts[id]) {
      accounts[id] = {
        id,
        ownerType,
        ownerId,
        balance: initial,
        lowBalanceThreshold: defThreshold,
        updatedAt: nowISO(),
      };
    }
  };

  addIfMissing("admin", adminId, defBalance);
  companyIds.forEach((cid) => addIfMissing("company", cid, defBalance));
  memberIds.forEach(({ type, id }) => addIfMissing(type, id, defBalance));

  saveAll(accounts, tx, meta);
}

/* =============================== Reads =============================== */

export function getBalance(accountId: string): number {
  const acc = loadAccounts()[accountId];
  return acc?.balance ?? 0;
}

export function listAccounts(filter?: { ownerType?: AccountOwnerType }): CreditAccount[] {
  const all = Object.values(loadAccounts());
  return filter?.ownerType ? all.filter((a) => a.ownerType === filter.ownerType) : all;
}

export function getBalancesByIds(ids: string[]): Array<{ id: string; balance: number; low: boolean }> {
  const accs = loadAccounts();
  return ids.map((id) => {
    const a = accs[id];
    const bal = a?.balance ?? 0;
    const thr = a?.lowBalanceThreshold ?? LOW_BALANCE_THRESHOLD;
    return { id, balance: bal, low: bal <= thr };
  });
}

export function listTransactions(params?: { accountId?: string; limit?: number }): CreditTx[] {
  return history(params);
}

export function history(params?: { accountId?: string; limit?: number }): CreditTx[] {
  const all = loadTx();
  let list = all;
  if (params?.accountId) {
    const id = params.accountId;
    list = all.filter(
      (t: any) =>
        (t as any).accountId === id ||
        (t as any).fromAccountId === id ||
        (t as any).toAccountId === id ||
        (t as any).payerAccountId === id
    );
  }
  if (params?.limit && params.limit > 0) return list.slice(-params.limit);
  return list;
}

export function isLowBalance(accountId: string): boolean {
  const acc = loadAccounts()[accountId];
  if (!acc) return false;
  const thr = acc.lowBalanceThreshold ?? LOW_BALANCE_THRESHOLD;
  return acc.balance <= thr;
}

/* =============================== Writes =============================== */

function persistAccountsAndTx(nextAccounts: AccountsIndex, appendedTx: CreditTx[], prevMeta: Meta, retries = 2) {
  const nextTx = [...loadTx(), ...appendedTx];
  for (let i = 0; i <= retries; i++) {
    if (saveAll(nextAccounts, nextTx, i === 0 ? prevMeta : undefined)) return true;
  }
  return false;
}

export function topup(toAccountId: string, amount: number, meta?: any): CreditTx {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("amount deve essere intero > 0");
  const prevMeta = loadMeta();
  const accounts = { ...loadAccounts() };
  const acc = mustAccount(toAccountId);
  const ts = nowISO();
  const nextBalance = acc.balance + amount;
  const tx: CreditTx = {
    id: txId("topup"),
    ts,
    type: "topup",
    toAccountId,
    amount,
    meta: {
      ...meta,
      balance_after: nextBalance,
      lowBalance: nextBalance <= (acc.lowBalanceThreshold ?? LOW_BALANCE_THRESHOLD),
    },
  } as any;
  const nextAcc = { ...acc, balance: nextBalance, updatedAt: ts };
  accounts[toAccountId] = nextAcc;
  const ok = persistAccountsAndTx(accounts, [tx], prevMeta);
  if (!ok) throw new Error("Race condition nel salvataggio topup");
  maybeNotifyLow(nextAcc, ts);
  return tx;
}

export function transfer(fromAccountId: string, toAccountId: string, amount: number, meta?: any): CreditTx {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("amount deve essere intero > 0");
  if (fromAccountId === toAccountId) throw new Error("from e to coincidono");
  const prevMeta = loadMeta();
  const accounts = { ...loadAccounts() };
  const from = mustAccount(fromAccountId);
  const to = mustAccount(toAccountId);
  if (from.balance < amount) throw new Error("Fondi insufficienti");

  const ts = nowISO();
  const fromNext = from.balance - amount;
  const toNext = to.balance + amount;
  const tx: CreditTx = {
    id: txId("transfer"),
    ts,
    type: "transfer",
    fromAccountId,
    toAccountId,
    amount,
    meta: {
      ...meta,
      postBalanceFrom: fromNext,
      postBalanceTo: toNext,
      lowBalanceFrom: fromNext <= (from.lowBalanceThreshold ?? LOW_BALANCE_THRESHOLD),
      lowBalanceTo: toNext <= (to.lowBalanceThreshold ?? LOW_BALANCE_THRESHOLD),
    },
  } as any;

  const nextFrom = { ...from, balance: fromNext, updatedAt: ts };
  const nextTo = { ...to, balance: toNext, updatedAt: ts };
  accounts[fromAccountId] = nextFrom;
  accounts[toAccountId] = nextTo;

  const ok = persistAccountsAndTx(accounts, [tx], prevMeta);
  if (!ok) throw new Error("Race condition nel salvataggio transfer");
  maybeNotifyLow(nextFrom, ts);
  maybeNotifyLow(nextTo, ts);
  return tx;
}

export function setLowBalanceThreshold(accountId: string, threshold: number) {
  if (!Number.isInteger(threshold) || threshold < 0) throw new Error("threshold deve essere intero >= 0");
  const prevMeta = loadMeta();
  const accounts = { ...loadAccounts() };
  const acc = mustAccount(accountId);
  const next = { ...acc, lowBalanceThreshold: threshold, updatedAt: nowISO() };
  accounts[accountId] = next;
  const ok = persistAccountsAndTx(accounts, [], prevMeta);
  if (!ok) throw new Error("Race condition nel salvataggio threshold");
  maybeNotifyLow(next, next.updatedAt!);
}
export const setThreshold = setLowBalanceThreshold;

/* ============================ Dedup helpers ============================ */

function makeDedupKey(action: CreditAction, ref?: { id?: string; eventId?: string; productId?: string }): string | undefined {
  const base = ref?.eventId || ref?.id || "";
  if (!base) return undefined;
  return `${action}:${base}`;
}
function findByDedup(dedup: string): CreditTx | undefined {
  return loadTx().find((t) => (t as any)?.meta?.dedup_key === dedup);
}

/* ============================ Consume types ============================ */

type ConsumeRef = {
  kind?: string;
  id?: string;
  productId?: string;
  eventId?: string;
  islandId?: string;
  assignedToDid?: string;
  [k: string]: any;
};

/* ================= Sponsor/payer resolution (policy-aware) =============== */

function buildChain(action: CreditAction, actor: ConsumeActor): string[] {
  const rule: SponsorshipRule | undefined = SPONSORSHIP[action];
  const cfg = getChargePolicy();
  const order = (rule?.payerOrder?.length ? rule!.payerOrder : cfg.fallbackOrder) as Array<
    "actor" | "company" | "admin"
  >;
  const out: string[] = [];
  for (const who of order) {
    if (who === "actor") out.push(getAccountId(actor.ownerType, actor.ownerId));
    if (who === "company" && actor.companyId) out.push(getAccountId("company", actor.companyId));
    if (who === "admin") {
      const a = getAdminAccountId();
      if (a) out.push(a);
    }
  }
  return out;
}

function resolvePayer(
  action: CreditAction,
  actor: ConsumeActor,
  cost: number,
  ref?: ConsumeRef
): { payerAccountId?: string; willChargeIslandBucket?: boolean; reason?: "NO_PAYER" | "INSUFFICIENT_FUNDS" } {
  const cfg = getChargePolicy();
  const accounts = loadAccounts();

  // priorità attore assegnato
  if (cfg.preferActor && ref?.assignedToDid) {
    const memberAcc = findMemberAccount(ref.assignedToDid);
    if (memberAcc && (accounts[memberAcc]?.balance ?? 0) >= cost) {
      return { payerAccountId: memberAcc, willChargeIslandBucket: false };
    }
  }

  // priorità isola → require company payer + bucket capiente
  if (cfg.preferIsland && ref?.islandId && actor.companyId) {
    const companyAcc = getAccountId("company", actor.companyId);
    const bal = accounts[companyAcc]?.balance ?? 0;
    const islandBal = getIslandBudget(actor.companyId, ref.islandId);
    if (bal >= cost && islandBal >= cost) {
      return { payerAccountId: companyAcc, willChargeIslandBucket: true };
    }
  }

  // fallback catena sponsor
  const chain = buildChain(action, actor);
  if (chain.length === 0) return { reason: "NO_PAYER" };
  for (const accId of chain) {
    const bal = accounts[accId]?.balance ?? 0;
    if (bal >= cost) return { payerAccountId: accId, willChargeIslandBucket: false };
  }
  return { reason: "INSUFFICIENT_FUNDS" };
}

export function simulate(
  action: CreditAction,
  actor: ConsumeActor,
  qty = 1,
  ref?: ConsumeRef
): { cost: number; payer?: string; reason?: string; willChargeIslandBucket?: boolean } {
  const cost = round6(getActionCost(action, qty));
  const res = resolvePayer(action, actor, cost, ref);
  return {
    cost,
    payer: res.payerAccountId,
    reason: res.reason,
    willChargeIslandBucket: res.willChargeIslandBucket,
  };
}

/* ============================== Consume core ============================== */

function __consumeCore(
  action: CreditAction,
  actor: ConsumeActor,
  ref?: ConsumeRef,
  qty = 1
): ConsumeResult {
  const unit = PRICE_TABLE[action];
  if (!(typeof unit === "number" && unit > 0)) {
    return { ok: false, reason: "NO_PAYER", detail: `Prezzo non definito per ${action}` };
  }
  const n = Number.isFinite(qty) && qty > 0 ? qty : 1;
  const cost = round6(unit * n);

  const res = resolvePayer(action, actor, cost, ref);
  const payerAccountId = res.payerAccountId;
  if (!payerAccountId) {
    return { ok: false, reason: res.reason ?? "NO_PAYER", detail: { action, actor, cost } };
  }

  const prevMeta = loadMeta();
  const accounts = { ...loadAccounts() };
  const payer = mustAccount(payerAccountId);
  if (payer.balance < cost) {
    return { ok: false, reason: "INSUFFICIENT_FUNDS", detail: { payerAccountId, cost, balance: payer.balance } };
  }

  // Island bucket charge se richiesto
  let islandBucketCharged = false;
  if (ref?.islandId && res.willChargeIslandBucket) {
    const { ownerType, ownerId } = splitAccountId(payerAccountId);
    if (ownerType === "company" && ownerId) {
      addToIslandBudget(ownerId, ref.islandId, -cost);
      islandBucketCharged = true;
    }
  }

  const ts = nowISO();
  const nextBalance = round6(payer.balance - cost);
  const low = nextBalance <= (payer.lowBalanceThreshold ?? LOW_BALANCE_THRESHOLD);

  const payerOwnerType = splitAccountId(payerAccountId).ownerType;
  const tx: CreditTx = {
    id: txId("consume"),
    ts,
    type: "consume",
    fromAccountId: payerAccountId,
    amount: cost,
    action,
    meta: {
      actor,
      ref,
      balance_after: nextBalance,
      lowBalance: low,
      islandBucketCharged,
      payerType: payerOwnerType === "company" ? "company" : payerOwnerType === "admin" ? "admin" : "member",
    },
  } as any;

  const nextPayer = { ...payer, balance: nextBalance, updatedAt: ts };
  const accountsNext = { ...accounts, [payerAccountId]: nextPayer };

  const ok = persistAccountsAndTx(accountsNext, [tx], prevMeta);
  if (!ok) return { ok: false, reason: "NO_PAYER", detail: "Race condition nel salvataggio consume" };

  maybeNotifyLow(nextPayer, ts);
  const result: any = { ok: true, payerAccountId, tx, cost, bucketId: islandBucketCharged ? ref?.islandId : undefined };
  return result as ConsumeResultOk;
}

/* ============================ Public consume ============================ */

export function consume(
  actionOrArgs: CreditAction | { companyId: string; action: CreditAction; ref?: ConsumeRef; islandId?: string },
  actor?: ConsumeActor,
  ref?: ConsumeRef,
  qty = 1
): ConsumeResult {
  if (typeof actionOrArgs === "object" && (actionOrArgs as any).action) {
    const args = actionOrArgs as { companyId: string; action: CreditAction; ref?: ConsumeRef; islandId?: string };
    const a: ConsumeActor = {
      ownerType: "company",
      ownerId: args.companyId,
      companyId: args.companyId,
    } as any;
    const r = { ...(args.ref ?? {}), islandId: args.islandId ?? args.ref?.islandId } as ConsumeRef;
    return __consumeCore(args.action, a, r, 1);
  }
  return __consumeCore(actionOrArgs as CreditAction, actor as ConsumeActor, ref, qty);
}

/* ================================ Spend ================================= */

const SPEND_ACTIONS: CreditAction[] = [
  "ASSIGNMENT_CREATE",
  "TELEMETRY_PACKET",
  "MACHINE_AUTOCOMPLETE",
] as unknown as CreditAction[];

export function spend(
  action: CreditAction,
  actor: ConsumeActor,
  ref?: ConsumeRef,
  qty = 1,
  dedup_key?: string
): ConsumeResult {
  if (!SPEND_ACTIONS.includes(action)) {
    return consume(action, actor, ref, qty);
  }

  const n = Number.isFinite(qty) && qty > 0 ? qty : 1;
  const cost = round6(getActionCost(action, n));
  const dk = dedup_key || makeDedupKey(action, ref);
  if (dk) {
    const existing = findByDedup(dk);
    if (existing) {
      const bucketId =
        (existing as any)?.meta?.islandBucketCharged ? (existing as any)?.meta?.ref?.islandId : undefined;
      return { ok: true, payerAccountId: (existing as any).fromAccountId, tx: existing, cost, bucketId } as any;
    }
  }

  const res = resolvePayer(action, actor, cost, ref);
  const payerAccountId = res.payerAccountId;
  if (!payerAccountId) {
    return { ok: false, reason: res.reason ?? "NO_PAYER", detail: { action, actor, cost } };
  }

  const prevMeta = loadMeta();
  const accounts = { ...loadAccounts() };
  const payer = mustAccount(payerAccountId);
  if (payer.balance < cost) {
    return { ok: false, reason: "INSUFFICIENT_FUNDS", detail: { payerAccountId, cost, balance: payer.balance } };
  }

  let islandBucketCharged = false;
  if (ref?.islandId && res.willChargeIslandBucket) {
    const { ownerType, ownerId } = splitAccountId(payerAccountId);
    if (ownerType === "company" && ownerId) {
      addToIslandBudget(ownerId, ref.islandId, -cost);
      islandBucketCharged = true;
    }
  }

  const ts = nowISO();
  const nextBalance = round6(payer.balance - cost);
  const low = nextBalance <= (payer.lowBalanceThreshold ?? LOW_BALANCE_THRESHOLD);

  const payerOwnerType = splitAccountId(payerAccountId).ownerType;
  const tx: CreditTx = {
    id: txId("spend"),
    ts,
    type: action as unknown as string,
    fromAccountId: payerAccountId,
    amount: cost,
    meta: {
      actor,
      ref: {
        ...ref,
        productId: ref?.productId,
        eventId: ref?.eventId,
        actorDid: actor?.ownerId,
      },
      balance_after: nextBalance,
      lowBalance: low,
      islandBucketCharged,
      payerType: payerOwnerType === "company" ? "company" : payerOwnerType === "admin" ? "admin" : "member",
      dedup_key: dk,
    },
  } as any;

  const nextPayer = { ...payer, balance: nextBalance, updatedAt: ts };
  const ok = persistAccountsAndTx({ ...accounts, [payerAccountId]: nextPayer }, [tx], prevMeta);
  if (!ok) return { ok: false, reason: "NO_PAYER", detail: "Race condition nel salvataggio spend" };

  maybeNotifyLow(nextPayer, ts);
  const result: any = { ok: true, payerAccountId, tx, cost, bucketId: islandBucketCharged ? ref?.islandId : undefined };
  return result as ConsumeResultOk;
}

/* ============================= Maintenance ============================= */

export function __resetAll() {
  writeJSON(KEYS.ACCOUNTS, {});
  writeJSON(KEYS.TX, []);
  writeJSON(KEYS.META, { version: 0, counter: 0 } as Meta);
  writeJSON(KEYS.ISLAND_BUCKETS, {});
}
