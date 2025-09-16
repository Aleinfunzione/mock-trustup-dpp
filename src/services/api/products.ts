import { STORAGE_KEYS, PRODUCT_TYPES_BY_CATEGORY } from "@/utils/constants";
import { safeGet, safeSet } from "@/utils/storage";
import type { Product, BomNode, ProductId } from "@/types/product";
import type { ProductType, JsonSchema } from "@/types/productType";
import Ajv from "ajv";
import { createEvent } from "@/services/api/events";

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

/* ---------------- persistence ---------------- */

type ProductsMap = Record<string, Product>;
type ProductTypesMap = Record<string, ProductType>;

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

/* ---------------- validation ---------------- */

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
  const ok = validate(prod.attributes ?? {});
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

    const hasRef = !!node.componentRef;
    const hasName = !!node.placeholderName;
    if (hasRef && hasName) return false; // alternativi, non entrambi

    if (stack.includes(node.id)) return false; // ciclo

    const children = node.children ?? [];
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

/* ---------------- API Products ---------------- */

export interface CreateProductInput {
  companyDid: string;
  createdByDid: string;
  name: string;
  sku?: string;
  typeId: string;
  attributes?: Record<string, any>;
  bom?: BomNode[];
}

export function listProductsByCompany(companyDid: string): Product[] {
  const map = getProductsMap();
  return Object.values(map).filter((p) => p.companyDid === companyDid);
}

export function getProduct(id: ProductId): Product | undefined {
  const map = getProductsMap();
  return map[id];
}

export function deleteProduct(id: ProductId): void {
  const map = getProductsMap();
  const existing = map[id];
  if (!existing) return;

  // Evento prima di rimuovere
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
  patch: Partial<Omit<Product, "id" | "companyDid" | "createdByDid" | "createdAt">>
): Product {
  const map = getProductsMap();
  const existing = map[id];
  if (!existing) throw new Error("Prodotto inesistente");

  const next: Product = {
    ...existing,
    ...patch,
    updatedAt: nowISO(),
  };

  // validazioni
  const types = getProductTypesMap();
  const type = types[next.typeId];
  const v1 = validateProductAgainstType(next, type);
  if (!v1.ok) throw new Error(v1.error);
  const v2 = validateBOM(next.bom ?? []);
  if (!v2.ok) throw new Error(v2.error);

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

export function createProduct(input: CreateProductInput): Product {
  const id = `prd_${randomHex(8)}`;
  const product: Product = {
    id,
    companyDid: input.companyDid,
    createdByDid: input.createdByDid,
    name: input.name,
    sku: input.sku,
    typeId: input.typeId,
    attributes: input.attributes ?? {},
    bom: input.bom ?? [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
    isPublished: false,
  };

  const types = getProductTypesMap();
  const type = types[product.typeId];
  const v1 = validateProductAgainstType(product, type);
  if (!v1.ok) throw new Error(v1.error);

  const v2 = validateBOM(product.bom);
  if (!v2.ok) throw new Error(v2.error);

  const map = getProductsMap();
  map[id] = product;
  saveProductsMap(map);

  // Evento di creazione
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
  // Se non c'è mappatura o è vuota, non filtrare
  if (allowedIds.size === 0) return all;

  const filtered = all.filter((t) => allowedIds.has(t.id));
  // Se nessuno dei typeId mappati esiste nello storage, fallback a tutti
  return filtered.length > 0 ? filtered : all;
}

export function upsertProductType(pt: ProductType): ProductType {
  const map = getProductTypesMap();
  map[pt.id] = pt;
  saveProductTypesMap(map);
  return pt;
}

/* ---------------- Publish DPP (MOCK) ---------------- */

export async function publishDPP(productId: ProductId): Promise<Product> {
  const map = getProductsMap();
  const prod = map[productId];
  if (!prod) throw new Error("Prodotto inesistente");

  const hash = await sha256Hex(JSON.stringify({ id: prod.id, at: Date.now(), prod }));
  prod.isPublished = true;
  prod.dppId = `vc:mock:${hash.slice(0, 24)}`;
  prod.updatedAt = nowISO();

  map[productId] = prod;
  saveProductsMap(map);

  // Evento di pubblicazione
  createEvent({
    type: "dpp.published",
    productId: prod.id,
    companyDid: prod.companyDid,
    actorDid: prod.createdByDid,
    data: { dppId: prod.dppId },
  });

  return prod;
}
