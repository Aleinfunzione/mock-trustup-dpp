// src/stores/creditTx.ts
import type { CreditTx, CreditAccount } from "@/types/credit";
import { STORAGE_KEYS } from "@/utils/constants";

type AccountsIndex = Record<string, CreditAccount>;
type Meta = { version: number; counter: number };

const KEYS = {
  ACCOUNTS: (STORAGE_KEYS as any)?.CREDITS_ACCOUNTS ?? "trustup:credits:accounts",
  TX: (STORAGE_KEYS as any)?.CREDITS_TX ?? "trustup:credits:tx",
  META: (STORAGE_KEYS as any)?.CREDITS_META ?? "trustup:credits:meta",
};

/* ---------------- storage ---------------- */
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

/* ---------------- helpers ---------------- */
const nowISO = () => new Date().toISOString();

/** merge shallow mantenendo il valore esistente se patchMeta non lo specifica */
function mergeMetaSafe(existing: any, patchMeta?: Record<string, any>) {
  const prev = existing ?? {};
  const patch = patchMeta ?? {};
  const keep = ["dedup_key"]; // non sovrascrivere chiavi critiche se non passate
  const next: Record<string, any> = { ...prev, ...patch };
  for (const k of keep) {
    if (prev[k] !== undefined && patch[k] === undefined) next[k] = prev[k];
  }
  return next;
}

/* ---------------- API ---------------- */

/**
 * Annota una transazione esistente unendo shallow `ref` e/o `meta`.
 * - Scrive sia `tx.ref` che `tx.meta.ref` per compatibilità.
 * - Aggiunge `meta.txUpdatedAt`.
 * Ritorna true se aggiornato, false se non trovata o race di versione.
 */
export function annotateTx(
  txId: string,
  patch: { ref?: Record<string, any>; meta?: Record<string, any> }
): boolean {
  if (!txId || (!patch?.ref && !patch?.meta)) return false;

  const prevMeta = loadMeta();
  const accounts = loadAccounts();
  const txList = loadTx();

  const idx = txList.findIndex((t) => t.id === txId);
  if (idx < 0) return false;

  const original: any = txList[idx] ?? {};
  const next: any = { ...original };

  // merge ref su due livelli: top-level e dentro meta.ref
  if (patch.ref) {
    next.ref = { ...(original.ref ?? {}), ...patch.ref };
    const meta0 = mergeMetaSafe(original.meta);
    meta0.ref = { ...(original.meta?.ref ?? {}), ...patch.ref };
    next.meta = meta0;
  }

  // merge meta, preservando chiavi critiche se non specificate
  if (patch.meta) {
    next.meta = mergeMetaSafe(next.meta ?? original.meta, patch.meta);
  } else {
    next.meta = mergeMetaSafe(next.meta ?? original.meta);
  }

  // timbro aggiornamento
  next.meta.txUpdatedAt = nowISO();

  txList[idx] = next;

  // tenta salvataggio con controllo versione, poi senza
  for (let attempt = 0; attempt < 2; attempt++) {
    if (saveAll(accounts, txList, attempt === 0 ? prevMeta : undefined)) return true;
  }
  return false;
}
