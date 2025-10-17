// src/services/standards/export.ts
// Helper di export client-side per JSON e JSON-LD.

export type DownloadOptions = {
  indent?: number;   // default 2
  jsonld?: boolean;  // se true usa estensione .jsonld e MIME JSON-LD
  bom?: boolean;     // riservato, non usato
};

function safeFileName(name: string, ext: string) {
  const base = String(name || "export")
    .replace(/[^a-z0-9_\-\.]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
  return base ? (base.endsWith(`.${ext}`) ? base : `${base}.${ext}`) : `export.${ext}`;
}

function makeBlob(content: string, type: string) {
  try {
    return new Blob([content], { type });
  } catch {
    return new Blob([content]);
  }
}

function triggerDownload(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadJson(name: string, obj: unknown, opts: DownloadOptions = {}): void {
  const indent = Number.isFinite(opts.indent as number) ? (opts.indent as number) : 2;
  const isJsonLd = !!opts.jsonld;
  const ext = isJsonLd ? "jsonld" : "json";
  const filename = safeFileName(name, ext);
  const json = JSON.stringify(obj, null, indent);
  const mime = isJsonLd ? "application/ld+json" : "application/json";
  const blob = makeBlob(json, mime);
  triggerDownload(blob, filename);
}

/* --------------------------------- Convenienze --------------------------------- */

function ensureW3CContext<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;
  return obj["@context"]
    ? obj
    : ({ "@context": ["https://www.w3.org/2018/credentials/v1"], ...obj } as T);
}

export function exportVC(vc: unknown, nameHint = "vc"): void {
  // Le VC sono JSON-LD: usa MIME/estensione JSON-LD
  downloadJson(`${nameHint}_VC`, vc, { jsonld: true });
}

export function exportVP(vp: unknown, nameHint = "vp"): void {
  const withCtx =
    vp && typeof vp === "object" ? ensureW3CContext(vp as Record<string, any>) : vp;
  downloadJson(`${nameHint}_VP`, withCtx, { jsonld: true });
}
