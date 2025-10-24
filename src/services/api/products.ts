// src/services/api/products.ts
// Mock-only su localStorage: prodotti, tipi prodotto e gestione "pillole" attributi
// per il flusso Catalogo → Form dinamico → Aggregazione { gs1, iso, euDpp }.
//
// NOTE:
// - Compatibile col codice esistente (tipi importati).
// - Estende internamente Product come ProductExt: attributesPills[] e dppDraft.
// - La validazione AJV del TIPO usa "attributes" (object); le pillole generano dppDraft.

import { STORAGE_KEYS, PRODUCT_TYPES_BY_CATEGORY } from "@/utils/constants";
import { safeGet, safeSet } from "@/utils/storage";
import type { Product, BomNode, ProductId } from "@/types/product";
import type { ProductType, JsonSchema } from "@/types/productType";
import Ajv from "ajv";
import { createEvent } from "@/services/api/events";

import type { PillInstance } from "@/config/attributeCatalog";
import { aggregateAttributes } from "@/services/dpp/attributes";

/* ---------------- utils ---------------- */

function nowISO(): string {
  return new Date().toISOString();
}

function randomHex(bytes = 8): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const bytes = Array.from(new Uint8Array(buf));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------------- tipi estesi (solo interni a questo modulo) ---------------- */

type ComplianceValue = string | number | boolean | null | undefined;

export type ProductExt = Product & {
  /** Pillole compilate dal Catalogo Attributi (RJSF). */
  attributesPills?: PillInstance[];
  /**
   * Draft DPP aggregato da pillole (firmabile nella VC DPP come credentialSubject).
   * Struttura: { gs1: any; iso: any; euDpp: any }
   */
  dppDraft?: any;
  /**
   * Attributi di compliance assegnati al prodotto (derivano da CompanyAttributes.compliance).
   */
  complianceAttrs?: Record<string, ComplianceValue>;
};

type ProductsMap = Record<string, ProductExt>;
type ProductTypesMap = Record<string, ProductType>;

/* ---------------- persistence ---------------- */

function getProductsMap(): ProductsMap {
  return safeGet<ProductsMap>(STORAGE_KEYS.products, {});
}
function saveProductsMap(map: ProductsMap): void {
  safeSet(STORAGE_KEYS.products, map);
}

function getProductTypesMap(): ProductTypesMap {
  const map = safeGet<ProductTypesMap>(STORAGE_KEYS.productTypes, {});
  if (Object.keys(map).length === 0) {
    // Tipo "generic" con JSON Schema minimale
    map["generic"] = {
      id: "generic",
      name: "Generic product",
      schema: {
        $id: "https://trustup.mock/schema/generic",
        type: "object",
        properties: {
          name: { type: "string" },
          sku: { type: "string" },
        },
        required: ["name"],
        additionalProperties: true,
      },
    };
    safeSet(STORAGE_KEYS.productTypes, map);
  }
  return map;
}
function saveProductTypesMap(map: ProductTypesMap): void {
  safeSet(STORAGE_KEYS.productTypes, map);
}

/* ---------------- validation (per tipi prodotto) ---------------- */

const ajv = new Ajv({ allErrors: true, strict: false });
const compiledCache = new Map<string, ReturnType<typeof ajv.compile>>();

function compile(schema?: JsonSchema) {
  if (!schema) return null;
  const key = JSON.stringify(schema);
  let fn = compiledCache.get(key);
  if (!fn) {
    fn = ajv.compile(schema);
    compiledCache.set(key, fn);
  }
  return fn;
}

export function validateProductAgainstType(
  prod: Product,
  type?: ProductType
): { ok: boolean; error?: string } {
  if (!type?.schema) return { ok: true };
  const validate = compile(type.schema);
  if (!validate) return { ok: true };
  // NB: la validazione del TIPO continua a riferirsi a "attributes" (object),
  // NON alle pillole. Le pillole generano dppDraft separato.
  const ok = validate((prod as any).attributes ?? {});
  if (!ok) {
    const msg = (validate.errors ?? [])
      .map((e) => `${e.instancePath || "attributes"} ${e.message}`)
      .join("; ");
    return { ok: false, error: msg || "Attributi non validi" };
  }
  return { ok: true };
}

export function validateBOM(root: BomNode[]): { ok: boolean; error?: string } {
  const ids = new Set<string>();

  function visit(node: BomNode, stack: string[]): boolean {
    if (!node.id) return false;
    if (ids.has(node.id)) return false; // id duplicato
    ids.add(node.id);

    const hasRef = !!(node as any).componentRef;
    const hasName = !!(node as any).placeholderName;
    if (hasRef && hasName) return false; // alternativi

    const children = (node.children ?? []) as BomNode[];
    if (stack.includes(node.id)) return false; // ciclo

    for (const ch of children) {
      const ok = visit(ch, [...stack, node.id]);
      if (!ok) return false;
    }
    return true;
  }

  for (const n of root ?? []) {
    if (!visit(n, [])) {
      return { ok: false, error: "BOM non valido (ciclo, id duplicati o ref/name non coerente)" };
    }
  }
  return { ok: true };
}

/* ---------------- helpers pillole/aggregato ---------------- */

/** Ricalcola e salva il dppDraft a partire da attributesPills[] */
function syncDppDraft(p: ProductExt) {
  const aggregated = aggregateAttributes(p.attributesPills || []);
  p.dppDraft = aggregated;
}

/* ---------------- Helpers compliance ---------------- */

function sanitizeComplianceAttrs(
  input: Record<string, ComplianceValue> | undefined | null
): Record<string, ComplianceValue> {
  const out: Record<string, ComplianceValue> = {};
  if (!input || typeof input !== "object") return out;
  for (const [k, v] of Object.entries(input)) {
    if (v === "") continue;
    out[k] = v as ComplianceValue;
  }
  return out;
}

/* ---------------- API Products (compat + estensioni) ---------------- */

export interface CreateProductInput {
  companyDid: string;
  createdByDid: string;
  name: string;
  sku?: string;
  typeId: string;
  attributes?: Record<string, any>;
  bom?: BomNode[];
}

// Elenco completo
export function listProducts(): Product[] {
  const map = getProductsMap();
  return Object.values(map);
}

export function listProductsByCompany(companyDid: string): Product[] {
  const map = getProductsMap();
  return Object.values(map).filter((p) => p.companyDid === companyDid);
}

export function getProduct(id: ProductId): Product | undefined {
  const map = getProductsMap();
  return map[id];
}

/** Wrapper richiesto dai componenti legacy */
export function getProductById(id: string): ProductExt | null {
  return (getProductsMap()[id] as ProductExt) || null;
}

export function deleteProduct(id: ProductId): void {
  const map = getProductsMap();
  const existing = map[id];
  if (!existing) return;

  createEvent({
    type: "product.updated",
    productId: existing.id,
    companyDid: existing.companyDid,
    actorDid: existing.createdByDid,
    data: { deleted: true },
  });

  delete map[id];
  saveProductsMap(map);
}

export function updateProduct(
  id: ProductId,
  patch: Partial<Omit<Product, "id" | "companyDid" | "createdByDid" | "createdAt">> & {
    complianceAttrs?: Record<string, ComplianceValue>;
  }
): Product {
  const map = getProductsMap();
  const existing = map[id] as ProductExt | undefined;
  if (!existing) throw new Error("Prodotto inesistente");

  const next: ProductExt = {
    ...existing,
    ...patch,
    complianceAttrs:
      patch.complianceAttrs !== undefined
        ? sanitizeComplianceAttrs(patch.complianceAttrs)
        : existing.complianceAttrs,
    updatedAt: nowISO(),
  };

  // validazioni (attributes + BOM)
  const types = getProductTypesMap();
  const type = types[next.typeId];
  const v1 = validateProductAgainstType(next, type);
  if (!v1.ok) throw new Error(v1.error);
  const v2 = validateBOM(next.bom ?? []);
  if (!v2.ok) throw new Error(v2.error);

  // mantieni in sync il draft DPP dalle pillole
  syncDppDraft(next);

  map[id] = next;
  saveProductsMap(map);

  // Eventi
  createEvent({
    type: "product.updated",
    productId: next.id,
    companyDid: next.companyDid,
    actorDid: next.createdByDid,
    data: { patchKeys: Object.keys(patch ?? {}) },
  });
  if (patch.bom) {
    createEvent({
      type: "bom.updated",
      productId: next.id,
      companyDid: next.companyDid,
      actorDid: next.createdByDid,
      data: { nodes: (patch.bom ?? []).length },
    });
  }

  return next;
}

/** API dedicata per la compliance: persiste `product.complianceAttrs` */
export function setProductCompliance(
  productId: ProductId,
  attrs: Record<string, ComplianceValue>
): Product {
  const map = getProductsMap();
  const p = map[productId] as ProductExt | undefined;
  if (!p) throw new Error("Prodotto inesistente");

  p.complianceAttrs = sanitizeComplianceAttrs(attrs);
  p.updatedAt = nowISO();

  map[productId] = p;
  saveProductsMap(map);

  createEvent({
    type: "product.updated",
    productId: p.id,
    companyDid: p.companyDid,
    actorDid: p.createdByDid,
    data: { action: "compliance.set", keys: Object.keys(p.complianceAttrs || {}) },
  });

  return p;
}

/** Facoltativa: lettura comoda degli attributi di compliance salvati */
export function getProductCompliance(productId: ProductId): Record<string, ComplianceValue> {
  const p = getProductById(productId);
  return (p?.complianceAttrs as Record<string, ComplianceValue>) ?? {};
}

export function setBOM(productId: ProductId, bom: BomNode[]) {
  const v = validateBOM(bom ?? []);
  if (!v.ok) throw new Error(v.error);
  return updateProduct(productId, { bom });
}

export function createProduct(input: CreateProductInput): Product {
  const id = `prd_${randomHex(8)}`;
  const product: ProductExt = {
    id,
    companyDid: input.companyDid,
    createdByDid: input.createdByDid,
    name: input.name,
    sku: input.sku,
    typeId: input.typeId,
    // Attributi classici per schema del tipo (rimangono oggetto):
    attributes: (input.attributes as any) ?? {},
    // BOM e pillole vuote all'inizio
    bom: input.bom ?? [],
    attributesPills: [],
    // Aggregato iniziale vuoto
    dppDraft: { gs1: {}, iso: {}, euDpp: {} },
    // Compliance inizialmente vuota
    complianceAttrs: {},
    // VC organizzative collegate
    attachedOrgVCIds: [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
    isPublished: false,
  };

  const types = getProductTypesMap();
  const type = types[product.typeId];
  const v1 = validateProductAgainstType(product, type);
  if (!v1.ok) throw new Error(v1.error);

  const v2 = validateBOM(product.bom ?? []);
  if (!v2.ok) throw new Error(v2.error);

  // Sync draft (anche se non ci sono pillole)
  syncDppDraft(product);

  const map = getProductsMap();
  map[id] = product;
  saveProductsMap(map);

  createEvent({
    type: "product.created",
    productId: product.id,
    companyDid: product.companyDid,
    actorDid: product.createdByDid,
    data: { name: product.name, typeId: product.typeId },
  });

  return product;
}

/* ---------------- Product Types ---------------- */

/**
 * Restituisce tutti i tipi o, se `categoryId` è valorizzato, solo i tipi
 * mappati in PRODUCT_TYPES_BY_CATEGORY[categoryId] e presenti nello storage.
 *
 * Se la categoria non è mappata o la lista è vuota, ritorna tutti i tipi (fallback).
 */
export function listProductTypes(categoryId?: string): ProductType[] {
  const all = Object.values(getProductTypesMap());
  if (!categoryId) return all;

  const allowedIds = new Set<string>(PRODUCT_TYPES_BY_CATEGORY[categoryId] ?? []);
  if (allowedIds.size === 0) return all;

  const filtered = all.filter((t) => allowedIds.has(t.id));
  return filtered.length > 0 ? filtered : all;
}

export function upsertProductType(pt: ProductType): ProductType {
  const map = getProductTypesMap();
  map[pt.id] = pt;
  saveProductTypesMap(map);
  return pt;
}

/* ---------------- Pillole attributi (Catalogo) ---------------- */

export function addPill(productId: string, pill: PillInstance) {
  const map = getProductsMap();
  const p = map[productId] as ProductExt | undefined;
  if (!p) throw new Error("Prodotto non trovato");
  p.attributesPills = p.attributesPills || [];
  p.attributesPills.push(pill);
  syncDppDraft(p);
  saveProductsMap(map);

  createEvent({
    type: "product.updated",
    productId: p.id,
    companyDid: p.companyDid,
    actorDid: p.createdByDid,
    data: { action: "pill.added", pillId: pill.id, catalogId: pill.catalogId, namespace: pill.namespace },
  });
}

export function updatePill(productId: string, pillId: string, data: any) {
  const map = getProductsMap();
  const p = map[productId] as ProductExt | undefined;
  if (!p || !p.attributesPills) throw new Error("Pillola non trovata");
  const idx = p.attributesPills.findIndex((x) => x.id === pillId);
  if (idx === -1) throw new Error("Pillola non trovata");
  p.attributesPills[idx] = { ...p.attributesPills[idx], data, updatedAt: nowISO() };
  syncDppDraft(p);
  saveProductsMap(map);

  createEvent({
    type: "product.updated",
    productId: p.id,
    companyDid: p.companyDid,
    actorDid: p.createdByDid,
    data: { action: "pill.updated", pillId },
  });
}

export function removePill(productId: string, pillId: string) {
  const map = getProductsMap();
  const p = map[productId] as ProductExt | undefined;
  if (!p || !p.attributesPills) return;
  p.attributesPills = p.attributesPills.filter((x) => x.id !== pillId);
  syncDppDraft(p);
  saveProductsMap(map);

  createEvent({
    type: "product.updated",
    productId: p.id,
    companyDid: p.companyDid,
    actorDid: p.createdByDid,
    data: { action: "pill.removed", pillId },
  });
}

/** Ritorna l’aggregato { gs1, iso, euDpp } calcolato dalle pillole del prodotto. */
export function getAggregatedAttributes(productId: string) {
  const p = getProductById(productId);
  return aggregateAttributes((p as ProductExt | null)?.attributesPills || []);
}

/* ---------------- VC organizzative collegate al prodotto ---------------- */

export function getAttachedOrgVCIds(productId: ProductId): string[] {
  const p = getProductsMap()[productId] as any;
  return Array.isArray(p?.attachedOrgVCIds) ? p.attachedOrgVCIds : [];
}

export function attachOrgVC(productId: ProductId, vcId: string): void {
  const map = getProductsMap();
  const p = map[productId] as any;
  if (!p) throw new Error("Prodotto non trovato");
  const set = new Set<string>(Array.isArray(p.attachedOrgVCIds) ? p.attachedOrgVCIds : []);
  set.add(vcId);
  p.attachedOrgVCIds = Array.from(set);
  p.updatedAt = nowISO();
  saveProductsMap(map);

  createEvent({
    type: "product.updated",
    productId: p.id,
    companyDid: p.companyDid,
    actorDid: p.createdByDid,
    data: { action: "orgvc.attach", vcId },
  });
}

export function detachOrgVC(productId: ProductId, vcId: string): void {
  const map = getProductsMap();
  const p = map[productId] as any;
  if (!p) return;
  const list = Array.isArray(p.attachedOrgVCIds) ? p.attachedOrgVCIds : [];
  p.attachedOrgVCIds = list.filter((id: string) => id !== vcId);
  p.updatedAt = nowISO();
  saveProductsMap(map);

  createEvent({
    type: "product.updated",
    productId: p.id,
    companyDid: p.companyDid,
    actorDid: p.createdByDid,
    data: { action: "orgvc.detach", vcId },
  });
}

/* ---------------- Publish DPP (MOCK) ---------------- */

export async function publishDPP(productId: ProductId): Promise<Product> {
  const map = getProductsMap();
  const prod = map[productId] as ProductExt | undefined;
  if (!prod) throw new Error("Prodotto inesistente");

  const hash = await sha256Hex(JSON.stringify({ id: prod.id, at: Date.now(), dppDraft: prod.dppDraft }));
  (prod as any).isPublished = true;
  (prod as any).dppId = `vc:mock:${hash.slice(0, 24)}`;
  prod.updatedAt = nowISO();

  map[productId] = prod;
  saveProductsMap(map);

  createEvent({
    type: "dpp.published",
    productId: prod.id,
    companyDid: (prod as any).companyDid,
    actorDid: (prod as any).createdByDid,
    data: { dppId: (prod as any).dppId },
  });

  return prod as Product;
}
