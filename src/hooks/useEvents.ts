import * as eventsApi from "@/services/api/events";
import type { ProductEvent, EventType } from "@/types/event";

// Forma attesa dai componenti UI
export type UIEvent = {
  id: string;
  productId: string;
  type: string;
  status: "open" | "in_progress" | "done" | string;
  notes?: string;
  byDid?: string;
  assignedToDid?: string;
  createdAt: string;   // = timestamp
  updatedAt?: string;  // = data.updatedAt
  hash?: string;
  signature?: string;
  __raw?: ProductEvent;
};

function toUI(e: ProductEvent): UIEvent {
  return {
    id: e.id,
    productId: e.productId,
    type: e.type as string,
    status: (e.data?.status as any) ?? "open",
    notes: e.data?.notes as any,
    byDid: e.actorDid,
    assignedToDid: e.data?.assignedToDid as any,
    createdAt: e.timestamp,
    updatedAt: e.data?.updatedAt as any,
    hash: (e.data as any)?.hash,
    signature: (e.data as any)?.signature,
    __raw: e,
  };
}

export function useEvents() {
  return {
    createEvent: async (input: {
      productId: string;
      companyDid: string;
      actorDid: string;
      type: EventType | string;
      notes?: string;
      assignedToDid?: string;
      status?: "open" | "in_progress" | "done" | string;
    }) => toUI(eventsApi.createEvent(input as any)),

    updateEventStatus: async (
      id: string,
      newStatus: "open" | "in_progress" | "done" | string,
      notes?: string
    ) => toUI(eventsApi.updateEventStatus(id, newStatus, notes)),

    listByProduct: async (productId: string) =>
      eventsApi.listEventsByProduct(productId).map(toUI),

    listByAssignee: async (assigneeDid: string) =>
      eventsApi.listEventsByAssignee(assigneeDid).map(toUI),

    listByType: async (type: EventType) =>
      eventsApi.listEventsByType(type).map(toUI),

    verifyEventIntegrity: async (u: UIEvent) =>
      eventsApi.verifyEventIntegrity(u.__raw ?? (u as any)),
  };
}
