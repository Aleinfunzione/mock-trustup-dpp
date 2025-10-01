// /src/services/storage/SnapshotStorage.ts
// Persistenza snapshot VP su localStorage.

type SnapshotRecord<T = any> = {
  id: string;
  publishedAt: string; // ISO
  vp: T;
};

const KEY = "trustup:vp:snapshots";

function readAll(): Record<string, SnapshotRecord> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, SnapshotRecord>) : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, SnapshotRecord>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export const SnapshotStorage = {
  save<T = any>(vp: T): { id: string; record: SnapshotRecord<T> } {
    const map = readAll();
    const id = `mock.vp.snapshot.${Date.now()}`;
    const record: SnapshotRecord<T> = { id, publishedAt: new Date().toISOString(), vp };
    map[id] = record as any;
    writeAll(map);
    return { id, record };
  },

  get<T = any>(id: string): SnapshotRecord<T> | undefined {
    const map = readAll();
    return map[id] as any;
  },

  list<T = any>(): SnapshotRecord<T>[] {
    const map = readAll();
    return Object.values(map).sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  },

  remove(id: string) {
    const map = readAll();
    if (map[id]) {
      delete map[id];
      writeAll(map);
    }
  },

  clear() {
    writeAll({});
  },
};
