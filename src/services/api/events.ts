import { STORAGE_KEYS } from "@/utils/constants";
import { safeGet, safeSet } from "@/utils/storage";
import type { ProductEvent, EventType } from "@/types/event";

type EventsMap = Record<string, ProductEvent>; // indicizzato per eventId

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

function getEventsMap(): EventsMap {
  return safeGet<EventsMap>(STORAGE_KEYS.events, {});
}

function saveEventsMap(map: EventsMap): void {
  safeSet(STORAGE_KEYS.events, map);
}

/* ---------------- internals ---------------- */

function listAllEvents(): ProductEvent[] {
  const map = getEventsMap();
  return Object.values(map);
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

/* ---------------- API principali ---------------- */

/**
 * Crea un evento (MOCK).
 * Accetta un input con eventuali campi UI (notes, assignedToDid, status) che verranno
 * salvati dentro `data.*` mantenendo il tuo tipo ProductEvent invariato.
 */
export function createEvent(
  input:
    | Omit<ProductEvent, "id" | "timestamp">
    | (Omit<ProductEvent, "id" | "timestamp" | "data"> & {
        notes?: string;
        assignedToDid?: string;
        status?: "open" | "in_progress" | "done" | string;
      })
): ProductEvent {
  const map = getEventsMap();
  const id = `evt_${randomHex(10)}`;

  const base: Omit<ProductEvent, "id" | "timestamp"> = {
    type: (input as any).type,
    productId: (input as any).productId,
    companyDid: (input as any).companyDid,
    actorDid: (input as any).actorDid,
    data: (input as any).data ?? {},
    related: (input as any).related,
  };

  const ui = input as any;
  base.data = {
    ...(base.data ?? {}),
    status: ui.status ?? "open",
    notes: ui.notes ?? (base.data?.notes as any),
    assignedToDid: ui.assignedToDid ?? (base.data?.assignedToDid as any),
  };

  const evt: ProductEvent = {
    id,
    timestamp: nowISO(),
    ...base,
  };

  map[id] = evt;
  saveEventsMap(map);
  return evt;
}

export function getEvent(id: string): ProductEvent | undefined {
  const map = getEventsMap();
  return map[id];
}

export function listEventsByProduct(productId: string): ProductEvent[] {
  const map = getEventsMap();
  return Object.values(map).filter((e) => e.productId === productId);
}

export function listEventsByCompany(
  companyDid: string,
  type?: EventType
): ProductEvent[] {
  const map = getEventsMap();
  return Object.values(map).filter(
    (e) => e.companyDid === companyDid && (type ? e.type === type : true)
  );
}

export function listEventsByType(type: EventType): ProductEvent[] {
  const map = getEventsMap();
  return Object.values(map).filter((e) => e.type === type);
}

/* ---------------- API aggiuntive per i componenti ---------------- */

export function listEventsByAssignee(assigneeDid: string): ProductEvent[] {
  return listAllEvents().filter((e) => e.data?.assignedToDid === assigneeDid);
}

export function updateEventStatus(
  id: string,
  newStatus: "open" | "in_progress" | "done" | string,
  notes?: string
): ProductEvent {
  return setEvent(id, (e) => ({
    ...e,
    data: {
      ...(e.data ?? {}),
      status: newStatus,
      notes: typeof notes === "string" && notes.length ? notes : e.data?.notes,
      updatedAt: nowISO(),
    },
  }));
}

/** Verifica integrità evento (mock basica) */
export function verifyEventIntegrity(evt: ProductEvent): boolean {
  return !!(evt && evt.id && evt.productId && evt.type);
}

/** Facoltativo: util per debug/ispezione */
export function listAll(): ProductEvent[] {
  return listAllEvents();
}
