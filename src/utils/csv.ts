// src/utils/csv.ts

export type CsvCell = string | number | boolean | null | undefined | Date;
export type CsvRow = CsvCell[];

export type CsvOptions = {
  /** Separatore di campo */
  sep?: string;
  /** Fine riga */
  eol?: "\n" | "\r\n";
  /** Includi BOM per compat Excel */
  bom?: boolean;
  /** Previeni formula injection in Excel prefixando ' ai campi che iniziano con = + - @ */
  safeExcel?: boolean;
};

const DEFAULTS: Required<CsvOptions> = {
  sep: ",",
  eol: "\n",
  bom: true,
  safeExcel: true,
};

const DANGEROUS_PREFIX = /^[=+\-@]/;

function toStringCell(v: CsvCell): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function escapeCellRaw(s: string, sep: string, safeExcel: boolean): string {
  // Excel/Sheets formula injection guard
  if (safeExcel && DANGEROUS_PREFIX.test(s)) s = `'` + s;

  const needsQuote = s.includes('"') || s.includes("\n") || s.includes("\r") || s.includes(sep);
  if (!needsQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function rowToLine(row: CsvRow, opts: Required<CsvOptions>): string {
  return row.map((c) => escapeCellRaw(toStringCell(c), opts.sep, opts.safeExcel)).join(opts.sep);
}

/** CSV da righe (retro-compatibile). */
export function toCsv(rows: CsvRow[], sep = ","): string {
  const opts = { ...DEFAULTS, sep };
  const body = rows.map((r) => rowToLine(r, opts)).join(opts.eol);
  return (opts.bom ? "\uFEFF" : "") + body;
}

/** CSV con opzioni avanzate. */
export function toCsvAdvanced(rows: CsvRow[], options?: CsvOptions): string {
  const opts = { ...DEFAULTS, ...(options || {}) };
  const body = rows.map((r) => rowToLine(r, opts)).join(opts.eol);
  return (opts.bom ? "\uFEFF" : "") + body;
}

/** Scarica CSV da righe (retro-compatibile). */
export function downloadCsv(filename: string, rows: CsvRow[], sep = ","): void {
  const data = toCsv(rows, sep);
  downloadCsvString(filename, data);
}

/** Scarica una stringa CSV già pronta. */
export function downloadCsvString(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Helper: CSV da oggetti con colonne dichiarate. */
export function toCsvFromObjects<T extends Record<string, any>>(
  items: T[],
  columns: Array<
    | string
    | {
        key: string;
        header?: string;
        map?: (value: any, item: T, index: number) => CsvCell;
      }
  >,
  options?: CsvOptions
): string {
  const cols = columns.map((c) =>
    typeof c === "string" ? { key: c, header: c, map: (v: any) => v as CsvCell } : c
  );
  const headers: CsvRow = cols.map((c) => c.header ?? c.key);
  const rows: CsvRow[] = [headers];

  items.forEach((it, i) => {
    rows.push(
      cols.map((c) => {
        const raw = it[c.key];
        return c.map ? c.map(raw, it, i) : (raw as CsvCell);
      })
    );
  });

  return toCsvAdvanced(rows, options);
}

/** Scarica CSV da oggetti con colonne dichiarate. */
export function downloadCsvFromObjects<T extends Record<string, any>>(
  filename: string,
  items: T[],
  columns: Parameters<typeof toCsvFromObjects<T>>[1],
  options?: CsvOptions
): void {
  const csv = toCsvFromObjects(items, columns, options);
  downloadCsvString(filename, csv);
}
