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
  } catch {
    // no-op
  }
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

/**
 * Aggiorna una transazione esistente unendo shallow `ref` e/o `meta`.
 * Restituisce true se il salvataggio va a buon fine, false altrimenti.
 */
export function annotateTx(
  txId: string,
  patch: { ref?: Record<string, any>; meta?: Record<string, any> }
): boolean {
  const prevMeta = loadMeta();
  const accounts = loadAccounts();
  const tx = loadTx();
  const i = tx.findIndex((t) => t.id === txId);
  if (i < 0) return false;

  const t = tx[i] as any;
  const next: any = { ...t };

  if (patch.ref) {
    // preferenza: campo top-level `ref`, e copia in `meta.ref` per compat
    next.ref = { ...(t.ref ?? {}), ...patch.ref };
    next.meta = { ...(t.meta ?? {}) };
    next.meta.ref = { ...(t.meta?.ref ?? {}), ...patch.ref };
  }
  if (patch.meta) {
    next.meta = { ...(next.meta ?? {}), ...patch.meta };
  }

  tx[i] = next;

  // tenta salvataggio con controllo versione, poi senza
  for (let r = 0; r < 2; r++) {
    if (saveAll(accounts, tx, r === 0 ? prevMeta : undefined)) return true;
  }
  return false;
}
