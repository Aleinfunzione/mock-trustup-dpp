// src/hooks/useEvents.ts
import * as eventsApi from "@/services/api/events";
import type {
  ProductEvent,
  EventType,
  EventStatus,
  EventListFilters,
  EventCreateInput,
} from "@/types/event";

/** Forma attesa dalla UI */
export type UIEvent = {
  id: string;
  productId: string;
  type: string;
  status: EventStatus | string;
  notes?: string;
  byDid?: string;
  assignedToDid?: string;
  islandId?: string;
  createdAt: string;   // = createdAt || timestamp
  updatedAt?: string;  // = data.updatedAt
  hash?: string;
  signature?: string;
  __raw?: ProductEvent;
};

function toUI(e: ProductEvent): UIEvent {
  return {
    id: e.id,
    productId: e.productId,
    type: String(e.type),
    status: (e.status as EventStatus) ?? (e.data?.status as any) ?? "done",
    notes: e.data?.notes as any,
    byDid: e.byDid || e.actorDid,
    assignedToDid: e.assignedToDid || (e.data?.assignedToDid as any),
    islandId: e.islandId || (e.data?.islandId as any),
    createdAt: e.createdAt || e.timestamp,
    updatedAt: e.data?.updatedAt as any,
    hash: (e.data as any)?.hash,
    signature: (e.data as any)?.signature,
    __raw: e,
  };
}

export function useEvents() {
  return {
    /** Crea evento con islandId/assignedToDid propagati anche in data.* */
    createEvent: async (input: EventCreateInput) =>
      toUI(
        eventsApi.createEvent({
          ...input,
          // note: EventCreateInput già include islandId/assignedToDid/data
        } as any)
      ),

    updateEventStatus: async (
      id: string,
      newStatus: EventStatus,
      notes?: string
    ) => toUI(eventsApi.updateEventStatus(id, newStatus, notes)),

    /** Lista per prodotto con filtri opzionali { islandId, assignedToDid, type, from, to } */
    listByProduct: async (
      productId: string,
      filters?: { islandId?: string; assignedToDid?: string; type?: EventType | string; from?: string; to?: string }
    ) => eventsApi.listEventsByProduct(productId, filters).map(toUI),

    /** Lista generale con filtri (company/product/island/assignee/type/range) */
    listEvents: async (filters: EventListFilters & { companyDid?: string }) =>
      eventsApi.listEvents(filters).map(toUI),

    listByAssignee: async (assigneeDid: string) =>
      eventsApi.listEventsByAssignee(assigneeDid).map(toUI),

    listByType: async (type: EventType) =>
      eventsApi.listEventsByType(type).map(toUI),

    verifyEventIntegrity: async (u: UIEvent) =>
      eventsApi.verifyEventIntegrity(u.__raw ?? (u as any)),
  };
}
