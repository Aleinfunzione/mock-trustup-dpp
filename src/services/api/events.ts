// src/services/api/events.ts
import { STORAGE_KEYS } from "@/utils/constants";
import { safeGet, safeSet } from "@/utils/storage";
import type {
  ProductEvent,
  EventType,
  EventListFilters,
  EventCreateInput,
  EventStatus,
} from "@/types/event";
import * as creditStore from "@/stores/creditStore";

/* ---------------- utils ---------------- */

function nowISO(): string {
  return new Date().toISOString();
}

function randomHex(bytes = 8): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------------- persistence ---------------- */

type EventsMap = Record<string, ProductEvent>;

function getEventsMap(): EventsMap {
  return safeGet<EventsMap>(STORAGE_KEYS.events, {});
}

function saveEventsMap(map: EventsMap): void {
  safeSet(STORAGE_KEYS.events, map);
}

/* ---------------- helpers ---------------- */

function coalesceStatus(s: any, fallback: EventStatus = "done"): EventStatus {
  const v = String(s || "").toLowerCase();
  if (v === "queued" || v === "in_progress" || v === "done") return v as EventStatus;
  return fallback;
}

function inRange(ts: string, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const t = ts || "";
  if (from && t < from) return false;
  if (to && t > to) return false;
  return true;
}

function mapEventToCreditAction(t: string): string {
  switch (String(t).toUpperCase()) {
    case "ASSIGNMENT_CREATE":
      return "ASSIGNMENT_CREATE";
    case "TELEMETRY_PACKET":
      return "TELEMETRY_PACKET";
    case "MACHINE_AUTOCOMPLETE":
      return "MACHINE_AUTOCOMPLETE";
    default:
      return "EVENT_CREATE";
  }
}

/* ---------------- API principali ---------------- */

export function createEvent(
  input:
    | (Omit<ProductEvent, "id" | "timestamp" | "createdAt"> & { notes?: string })
    | EventCreateInput
): ProductEvent {
  const i: any = input;

  // usa l'id fornito se presente per allineare dedup e riferimenti
  const id = (i?.id as string) || `evt_${randomHex(10)}`;
  const now = nowISO();
  const status: EventStatus = coalesceStatus(i.status ?? i.data?.status ?? "done");

  const evt: ProductEvent = {
    id,
    type: i.type as EventType | string,
    productId: i.productId,
    companyDid: i.companyDid,
    actorDid: i.actorDid,
    byDid: i.byDid || i.actorDid,
    timestamp: now,
    createdAt: now,
    status,
    islandId: i.islandId ?? i.data?.islandId,
    assignedToDid: i.assignedToDid ?? i.data?.assignedToDid,
    executedByDid: i.executedByDid,
    executedAt: i.executedAt,
    data: {
      ...(i.data ?? {}),
      notes: i.notes ?? i.data?.notes,
      status,
      assignedToDid: i.assignedToDid ?? i.data?.assignedToDid,
      islandId: i.islandId ?? i.data?.islandId,
      txRef: i.data?.txRef, // solo riferimento, nessun addebito qui
    },
    related: i.related,
  };

  // Billing idempotente con spend + dedup sulla coppia (action, eventId)
  try {
    const action = mapEventToCreditAction(evt.type as string);
    const islandForBilling = evt.islandId ?? evt.data?.islandId ?? null;

    const ref: any = {
      type: "event",
      id: evt.id,
      productId: evt.productId,
      eventType: evt.type,
      status: evt.status,
      assignedToDid: evt.assignedToDid || evt.data?.assignedToDid,
      islandId: islandForBilling || undefined,
    };

    const actor: any = {
      ownerType: "company",
      ownerId: evt.companyDid,
      companyId: evt.companyDid,
    };

    const dedup = `${action}:${evt.id}`;
    const res: any =
      typeof (creditStore as any)?.spend === "function"
        ? (creditStore as any).spend(action, actor, ref, 1, dedup)
        : null;

    if (res && res.ok) {
      const cost = Number(res.cost);
      const bucketId = res.bucketId as string | undefined;
      const txId = (res.tx && (res.tx.id || res.tx.txId)) as string | undefined;
      const payerType = (res.tx as any)?.meta?.payerType as string | undefined;

      (evt as any).cost = Number.isFinite(cost) ? cost : undefined;
      (evt as any).meta = {
        ...(evt as any).meta,
        islandBucketCharged: bucketId,
        payerType,
        txId,
      };

      evt.data = {
        ...(evt.data ?? {}),
        billing: {
          ...(evt.data?.billing ?? {}),
          cost: (evt as any).cost,
          islandBucketCharged: bucketId,
          payerType,
          txId,
        },
        txRef: evt.data?.txRef ?? txId,
      };
    }
  } catch {
    // best-effort: ignora errori di billing
  }

  const map = getEventsMap();
  map[id] = evt;
  saveEventsMap(map);

  return evt;
}

export function getEvent(id: string): ProductEvent | undefined {
  return getEventsMap()[id];
}

export function listEventsByProduct(
  productId: string,
  filters?: { islandId?: string; assignedToDid?: string; type?: EventType | string; from?: string; to?: string }
): ProductEvent[] {
  const all = listAllEvents().filter((e) => e.productId === productId);

  const f = filters || {};
  const out = all.filter((e) => {
    const created = e.createdAt || e.timestamp || "";
    const matchIsland = f.islandId ? e.islandId === f.islandId || e.data?.islandId === f.islandId : true;
    const matchAssignee = f.assignedToDid
      ? e.assignedToDid === f.assignedToDid || e.data?.assignedToDid === f.assignedToDid
      : true;
    const matchType = f.type ? e.type === f.type : true;
    const matchRange = inRange(created, f.from, f.to);
    return matchIsland && matchAssignee && matchType && matchRange;
  });

  return out.sort((a, b) => {
    const ta = (a.createdAt || a.timestamp || "");
    const tb = (b.createdAt || b.timestamp || "");
    return ta.localeCompare(tb);
  });
}

function listAllEvents(): ProductEvent[] {
  const map = getEventsMap();
  return Object.values(map);
}

export function listEvents(
  filters: EventListFilters & { companyDid?: string }
): ProductEvent[] {
  const all = listAllEvents();
  const out = all.filter((e) => {
    if (filters.companyDid && e.companyDid !== filters.companyDid) return false;
    if (filters.productId && e.productId !== filters.productId) return false;
    if (filters.type && e.type !== filters.type) return false;

    const created = e.createdAt || e.timestamp || "";
    if (!inRange(created, filters.from, filters.to)) return false;

    if (filters.islandId) {
      const ok = e.islandId === filters.islandId || e.data?.islandId === filters.islandId;
      if (!ok) return false;
    }
    if (filters.assignedToDid) {
      const ok = e.assignedToDid === filters.assignedToDid || e.data?.assignedToDid === filters.assignedToDid;
      if (!ok) return false;
    }
    return true;
  });

  return out.sort((a, b) => {
    const ta = (a.createdAt || a.timestamp || "");
    const tb = (b.createdAt || b.timestamp || "");
    return ta.localeCompare(tb);
  });
}

export function listEventsByCompany(companyDid: string, type?: EventType): ProductEvent[] {
  return listEvents({ companyDid, type });
}

export function listEventsByType(type: EventType): ProductEvent[] {
  return listEvents({ type });
}

export function listEventsByAssignee(assigneeDid: string): ProductEvent[] {
  return listAllEvents().filter(
    (e) => e.assignedToDid === assigneeDid || e.data?.assignedToDid === assigneeDid
  );
}

export function updateEventStatus(id: string, newStatus: EventStatus, notes?: string): ProductEvent {
  const status = coalesceStatus(newStatus);
  return setEvent(id, (e) => ({
    ...e,
    status,
    data: {
      ...(e.data ?? {}),
      status,
      notes: typeof notes === "string" && notes.length ? notes : e.data?.notes,
      updatedAt: nowISO(),
    },
  }));
}

function setEvent(
  id: string,
  updater: (e: ProductEvent) => ProductEvent
): ProductEvent {
  const map = getEventsMap();
  const curr = map[id];
  if (!curr) throw new Error(`Evento non trovato: ${id}`);
  const next = updater(curr);
  map[id] = next;
  saveEventsMap(map);
  return next;
}

export function verifyEventIntegrity(evt: ProductEvent): boolean {
  return !!(evt && evt.id && evt.productId && evt.type);
}

export function clearEvents(): void {
  saveEventsMap({});
}

export function listAll(): ProductEvent[] {
  return listAllEvents();
}
