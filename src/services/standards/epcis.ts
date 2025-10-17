// src/services/standards/epcis.ts
import type { VC } from "@/types/vc";
import { listVCs, verifyIntegrity } from "@/services/api/vc";
import { getProductById } from "@/services/api/products";
import { downloadJson } from "@/services/standards/export";

/** Tipo minimale di documento EPCIS JSON-LD arricchito con certificazioni */
export type EPCISDoc = {
  "@context"?: any;
  id?: string;
  type?: string | string[];
  certifications?: Certification[];
  [k: string]: any;
};

/** Shape base di una certificazione derivata da VC */
export type CertificationBase = {
  id: string;
  schemaId?: string;
  version: number;
  status: VC["status"];
  subject: { type: VC["subjectType"]; id: string };
  proof?: VC["proof"];
  // metadati utili lato supply-chain
  validFrom?: string;
  validUntil?: string;
  gtin?: string;
  lot?: string;
};

export type Certification = CertificationBase & {
  integrity?: { ok: boolean };
  billing?: { cost?: number; payerType?: string; payerAccountId?: string; txRef?: string };
};

export function vcToCertification(vc: VC): CertificationBase {
  return {
    id: vc.id,
    schemaId: vc.schemaId,
    version: vc.version ?? 1,
    status: vc.status,
    subject: { type: vc.subjectType, id: vc.subjectId as any },
    proof: vc.proof,
    validFrom: (vc as any).data?.validFrom,
    validUntil: (vc as any).data?.validUntil,
    gtin: (vc as any).data?.gtin,
    lot: (vc as any).data?.lot,
  };
}

function isCertification(x: any): x is Certification {
  return x && typeof x === "object" && "subject" in x && "schemaId" in x;
}

/** Aggiunge/merge l’array certifications in un EPCIS esistente (immutabile) */
export function attachCertifications(epcis: EPCISDoc, items: Array<VC | Certification>): EPCISDoc {
  const mapped: Certification[] = (items || []).map((it) =>
    isCertification(it) ? it : (vcToCertification(it as VC) as Certification)
  );
  return {
    ...epcis,
    "@context": epcis["@context"] ?? [
      "https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld",
    ],
    type: epcis.type ?? "EPCISDocument",
    certifications: [...(epcis.certifications ?? []), ...mapped],
  };
}

/** Costruisce una VP mock minimale a partire da un set di VC */
export function buildVP(productId: string, vcs: VC[]) {
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: "VP-MOCK",
    productId,
    createdAt: new Date().toISOString(),
    vcs: vcs.map((v) => ({ id: v.id, schemaId: v.schemaId, version: v.version ?? 1 })),
  };
}

/** EPCIS per prodotto: master data minimi + certificazioni (opzionale) */
export function buildEPCISProductDoc(
  productId: string,
  opts?: { product?: any; vcs?: Array<VC | Certification> }
): EPCISDoc {
  const p = opts?.product ?? {};
  const doc: EPCISDoc = {
    "@context": ["https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld"],
    type: "EPCISDocument",
    id: `epcis:product:${productId}:${Date.now()}`,
    creationDate: new Date().toISOString(),
    sender: "mock:trustup",
    epcisBody: {
      // In un EPCIS reale qui andrebbero gli eventi. Nel mock salviamo master data.
      extension: {
        product: {
          id: productId,
          name: p?.name ?? null,
          gtin: p?.gtin ?? p?.data?.gtin ?? null,
          lot: p?.lot ?? null,
          companyDid: p?.companyDid ?? null,
          islandId: p?.islandId ?? null,
        },
      },
    },
  };
  return opts?.vcs?.length ? attachCertifications(doc, opts.vcs) : doc;
}

/** Carica VC del prodotto, arricchisce con integrità e billing, costruisce EPCIS e scarica JSON-LD. Ritorna il doc. */
export async function exportEPCISFromProductId(productId: string): Promise<EPCISDoc> {
  const product = getProductById(productId) as any | undefined;

  // Recupero VC di prodotto con fallback robusto
  let vcsRaw: VC[] = [];
  try {
    // @ts-ignore: alcune implementazioni espongono questi filtri
    vcsRaw = (await (listVCs as any)({ type: "product", productId })) as VC[];
  } catch {
    const all = (await (listVCs as any)()) as VC[];
    vcsRaw =
      (all || []).filter((vc: any) => {
        const pid = vc?.data?.productId ?? vc?.metadata?.productId ?? vc?.metadata?.targetId;
        const scope = vc?.metadata?.scope ?? vc?.metadata?.target ?? vc?.data?.scope;
        return pid === productId || scope === "product";
      }) ?? [];
  }

  // Enrichment: integrità + billing
  const enrichedCerts: Certification[] = [];
  for (const vc of vcsRaw) {
    const base = vcToCertification(vc) as Certification;
    try {
      const r = await verifyIntegrity(vc as any);
      const ok = (r as any)?.ok ?? (r as any)?.valid ?? false;
      base.integrity = { ok: !!ok };
    } catch {
      base.integrity = { ok: false };
    }
    const b: any = (vc as any).billing;
    if (b && typeof b === "object") {
      base.billing = {
        cost: b.cost ?? b.amount,
        payerType: b.payerType,
        payerAccountId: b.payerAccountId ?? b.payerId,
        txRef: b.txRef,
      };
    }
    enrichedCerts.push(base);
  }

  const doc = buildEPCISProductDoc(productId, { product, vcs: enrichedCerts });
  const nameSafe = `${(product?.name || "product").toString().replace(/[^a-z0-9_\-]+/gi, "_")}_EPCIS`;
  downloadJson(nameSafe, doc, { jsonld: true });
  return doc;
}
