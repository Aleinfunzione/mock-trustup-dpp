// /src/services/dpp/aggregate.ts
import { getProductById as getProductSvc, updateProduct as updateProductSvc } from "@/services/api/products";
import * as EventsApi from "@/services/api/events";
import type { Product } from "@/types/product";
import { aggregateAttributes } from "./attributes";

type AggregateResult = {
  draft: any;
  digest: string;    // digest hex
  updatedAt: string; // ISO
};

/* ---------------- utils ---------------- */

function stableStringify(obj: unknown): string {
  // Stringify deterministico: ordina chiavi ad ogni livello
  const seen = new WeakSet();
  const sort = (v: any): any => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v)) return null; // evita cicli in mock
    seen.add(v);
    if (Array.isArray(v)) return v.map(sort);
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = sort(v[k]);
    return out;
  };
  return JSON.stringify(sort(obj));
}

async function sha256HexOrFnv(str: string): Promise<string> {
  try {
    if (globalThis.crypto?.subtle) {
      const data = new TextEncoder().encode(str);
      const buf = await crypto.subtle.digest("SHA-256", data);
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    // ignore and fallback
  }
  // Fallback FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

async function getEventsForProduct(productId: string): Promise<any[]> {
  const api: any = EventsApi as any;
  const fn =
    api.listByProduct ||
    api.listForProduct ||
    api.listByProductId ||
    api.listBy ||
    api.list; // fallback generico

  if (typeof fn === "function") {
    try {
      const res = fn.length >= 1 ? fn(productId) : fn({ productId });
      const out = Array.isArray(res) ? res : await Promise.resolve(res);
      return Array.isArray(out) ? out : [];
    } catch {
      return [];
    }
  }
  return [];
}

/* ---------------- DPP draft & publish ---------------- */

export async function aggregateDPP(productId: string): Promise<AggregateResult> {
  const prod = getProductSvc(productId) as Product | null;
  if (!prod) throw new Error("Prodotto non trovato");

  const events = await getEventsForProduct(productId);

  // Attributi aggregati da pillole se presenti (retro-compat con attributes)
  const pillsAggregated =
    (prod as any).dppDraft ??
    aggregateAttributes(((prod as any).attributesPills ?? []) as any[]);

  // DPP minimo "schema-friendly"
  const draft = {
    "@context": ["https://schema.org", "https://w3id.org/traceability/v1"],
    type: "DigitalProductPassport",
    meta: {
      productId,
      name: (prod as any).name,
      sku: (prod as any).sku,
      createdAt: (prod as any).createdAt ?? new Date().toISOString(),
      version: "1.0-mock",
      generator: "TRUSTUP Mock",
      companyDid: (prod as any).companyDid,
    },
    attributes: (prod as any).attributes ?? {}, // attributi legacy (object)
    aggregated: pillsAggregated,                 // { gs1, iso, euDpp }
    events,
    issuer: (prod as any).companyDid ?? "did:example:company",
  };

  const digest = await sha256HexOrFnv(stableStringify(draft));
  const now = new Date().toISOString();

  // Persisti lo stato bozza sul prodotto
  updateProductSvc(productId, {
    dppDraftDigest: digest,
    dppDraftUpdatedAt: now,
    hasNewDraftSincePublish:
      !!(prod as any).dppPublishedDigest && (prod as any).dppPublishedDigest !== digest,
    updatedAt: now,
  } as Partial<Product>);

  return { draft, digest, updatedAt: now };
}

export async function publishDPP(productId: string): Promise<{ dppId: string; digest: string }> {
  const prod = getProductSvc(productId) as any;
  if (!prod) throw new Error("Prodotto non trovato");

  // Assicurati di avere una bozza coerente
  const { draft, digest } = await aggregateDPP(productId);

  const dppId = `${productId}:${Date.now()}`;
  const snapshot = {
    id: dppId,
    publishedAt: new Date().toISOString(),
    digest,
    content: draft,
  };

  // Salva snapshot immutabile nel LS
  const key = `mock.dpp.snapshot.${dppId}`;
  localStorage.setItem(key, JSON.stringify(snapshot));

  // Aggiorna il prodotto come pubblicato
  updateProductSvc(
    productId,
    {
      isPublished: true,
      dppId,
      dppPublishedAt: snapshot.publishedAt,
      dppPublishedDigest: digest,
      hasNewDraftSincePublish: false,
      updatedAt: snapshot.publishedAt,
    } as Partial<Product> & Record<string, any>
  );

  return { dppId, digest };
}

export function getPublishedDPP(dppId: string) {
  const key = `mock.dpp.snapshot.${dppId}`;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
