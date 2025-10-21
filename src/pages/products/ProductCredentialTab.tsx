// src/pages/products/ProductCredentialTab.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";
import { useAuthStore } from "@/stores/authStore";
import type { VC, VCStatus } from "@/types/vc";
import { createProductVC, listVCs, revokeVC, supersedeVC, verifyIntegrity } from "@/services/api/vc";
import { exportVC } from "@/services/standards/export";
import VerifyFlag from "@/components/vc/VerifyFlag";
import CopyJsonBox from "@/components/vc/CopyJsonBox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown, Check, BadgeCheck, Ban, RefreshCcw, PlusCircle, FileJson, Download } from "lucide-react";
import { cn } from "@/lib/utils";

/** Props:
 * - productId: id interno prodotto
 * - defaultGTIN/lot: opzionali per pre-compilare
 */
type Props = {
  productId: string;
  defaultGTIN?: string;
  defaultLot?: string;
};

type ProdForm = {
  gtin: string;
  lot?: string;
  attributes?: string; // JSON string
  testResults?: string; // JSON string
};

const ALL_STANDARDS = Object.keys(StandardsRegistry) as StandardId[];
const DEFAULT_STD: StandardId = (ALL_STANDARDS[0] ?? "GS1") as StandardId;

function StandardCombobox({
  value,
  onChange,
  disabled,
  options,
}: {
  value: StandardId;
  onChange: (v: StandardId) => void;
  disabled?: boolean;
  options: { id: StandardId; label: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between" disabled={disabled}>
          {current ? current.label : "Seleziona schema"}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 min-w-[280px]">
        <Command>
          <CommandInput placeholder="Cerca schema..." />
          <CommandList>
            <CommandEmpty>Nessun risultato</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.id}
                  onSelect={(v) => {
                    onChange(v as StandardId);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Check className={cn("h-4 w-4", opt.id === value ? "opacity-100" : "opacity-0")} />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ProductCredentialTab({ productId, defaultGTIN = "", defaultLot = "" }: Props) {
  const { currentUser } = useAuthStore();
  const issuerDid = currentUser?.companyDid || currentUser?.did || "";

  const [standard, setStandard] = React.useState<StandardId>(DEFAULT_STD);
  const [busy, setBusy] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<ProdForm>({
    gtin: defaultGTIN,
    lot: defaultLot,
    attributes: "",
    testResults: "",
  });

  const [list, setList] = React.useState<VC[]>([]);
  const [preview, setPreview] = React.useState<VC | null>(null);
  const [integrity, setIntegrity] = React.useState<{ valid: boolean; expectedHash: string; actualHash: string } | null>(
    null
  );

  const [integrityMap, setIntegrityMap] = React.useState<Record<string, boolean>>({});
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null);

  // VP selection
  const [selectedIds, setSelectedIds] = React.useState<Record<string, boolean>>({});

  // filtro
  const [onlyValid, setOnlyValid] = React.useState<boolean>(true);

  const standardLabel = StandardsRegistry[standard]?.title ?? standard;

  const tableRows = React.useMemo(() => {
    let rows = list
      .filter((v) => v.schemaId === standard && v.subjectId === productId)
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    if (onlyValid) rows = rows.filter((v) => (v.status || "valid") === "valid");
    return rows;
  }, [list, standard, productId, onlyValid]);

  const currentVC = tableRows[0];

  async function reload() {
    setBusy(true);
    setErrorMsg(null);
    try {
      const out = await listVCs({ subjectType: "product", subjectId: productId });
      setList(out);
    } catch (e: any) {
      setErrorMsg(e?.message || "Errore caricamento VC");
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    void reload();
  }, [productId]); // eslint-disable-line

  React.useEffect(() => {
    setPreview(null);
    setIntegrity(null);
    setOkMsg(null);
    setErrorMsg(null);
    setSelectedIds({});
  }, [standard, productId]);

  function parseJSONOptional(s?: string) {
    if (!s) return undefined;
    try {
      return JSON.parse(s);
    } catch {
      throw new Error("JSON non valido in attributes/testResults");
    }
  }

  function validateForm() {
    if (!issuerDid) throw new Error("Issuer DID non disponibile");
    if (!productId) throw new Error("productId obbligatorio");
    if (!form.gtin) throw new Error("GTIN obbligatorio");
    parseJSONOptional(form.attributes);
    parseJSONOptional(form.testResults);
  }

  async function handleCreate() {
    try {
      setBusy(true);
      setErrorMsg(null);
      setOkMsg(null);
      validateForm();
      const vc = await createProductVC({
        schemaId: standard,
        issuerDid,
        subjectId: productId,
        data: {
          gtin: form.gtin,
          lot: form.lot,
          attributes: parseJSONOptional(form.attributes),
          testResults: parseJSONOptional(form.testResults),
        },
      });
      setPreview(vc);
      await reload();
      setOkMsg("VC di prodotto pubblicata");
    } catch (e: any) {
      setErrorMsg(e?.message || "Errore creazione VC");
    } finally {
      setBusy(false);
    }
  }

  async function handleSupersede() {
    try {
      setBusy(true);
      setErrorMsg(null);
      setOkMsg(null);
      if (!currentVC) throw new Error("Nessuna VC da sostituire");
      validateForm();
      const out = await supersedeVC(currentVC.id, {
        gtin: form.gtin,
        lot: form.lot,
        attributes: parseJSONOptional(form.attributes),
        testResults: parseJSONOptional(form.testResults),
      });
      setPreview(out.next);
      await reload();
      setOkMsg("VC sostituita");
    } catch (e: any) {
      setErrorMsg(e?.message || "Errore supersede");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    try {
      setBusy(true);
      setErrorMsg(null);
      setOkMsg(null);
      if (!currentVC) throw new Error("Nessuna VC da revocare");
      await revokeVC(currentVC.id, "revocata su richiesta");
      await reload();
      setOkMsg("VC revocata");
    } catch (e: any) {
      setErrorMsg(e?.message || "Errore revoca");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(v?: VC) {
    setBusy(true);
    setErrorMsg(null);
    setOkMsg(null);
    try {
      const target = v ?? currentVC;
      if (!target) throw new Error("Nessuna VC da verificare");
      setVerifyingId(target.id);
      const res = await verifyIntegrity(target.id);
      setIntegrity(res);
      setPreview(target);
      setIntegrityMap((m) => ({ ...m, [target.id]: !!res.valid }));
      setOkMsg(res.valid ? "Integrità: OK" : "Integrità: NON valida");
    } catch (e: any) {
      setErrorMsg(e?.message || "Errore verifica");
    } finally {
      setVerifyingId(null);
      setBusy(false);
    }
  }

  function togglePick(id: string, checked: boolean) {
    setSelectedIds((s) => ({ ...s, [id]: checked }));
  }

  function buildVPJson() {
    const picked = list.filter((v) => selectedIds[v.id]);
    const vp = {
      type: "VP-MOCK",
      productId,
      gtin: form.gtin || (picked[0] as any)?.data?.gtin,
      lot: form.lot || (picked[0] as any)?.data?.lot,
      createdAt: new Date().toISOString(),
      vcs: picked.map((v) => ({ id: v.id, schemaId: v.schemaId, version: v.version })),
    };
    return vp;
  }

  function downloadVP() {
    const vp = buildVPJson();
    const text = JSON.stringify(vp, null, 2);
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vp-${productId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const historyLinkForTx = (tx?: string) =>
    tx ? `/company/credits/history?txRef=${encodeURIComponent(tx)}` : "#";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>VC di prodotto</CardTitle>
          <CardDescription>Gestisci certificazioni GS1/UNCEFACT del prodotto e crea VP mock.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Schema</Label>
              <StandardCombobox
                value={standard}
                onChange={setStandard}
                disabled={busy}
                options={ALL_STANDARDS.map((id) => ({
                  id,
                  label: `${StandardsRegistry[id]?.title ?? id} [${id}]`,
                }))}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Schema path: <span className="font-mono">{StandardsRegistry[standard]?.schemaPath ?? "—"}</span>
              </div>
            </div>
            <div>
              <Label>Product ID</Label>
              <Input value={productId} readOnly className="font-mono" />
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleVerify()} disabled={busy || !currentVC}>
                <BadgeCheck className="h-4 w-4 mr-2" />
                Verifica VC corrente
              </Button>
              <Button size="sm" variant="destructive" onClick={handleRevoke} disabled={busy || !currentVC}>
                <Ban className="h-4 w-4 mr-2" />
                Revoca
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {errorMsg && <div className="text-sm text-destructive">{errorMsg}</div>}
      {okMsg && <div className="text-sm">{okMsg}</div>}

      {/* FORM */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dati VC — {standardLabel}</CardTitle>
          <CardDescription>GTIN, lotto e attributi chiave.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>GTIN</Label>
              <Input
                value={form.gtin}
                onChange={(e) => setForm((s) => ({ ...s, gtin: e.target.value }))}
                placeholder="es. 09506000134352"
              />
            </div>
            <div>
              <Label>Lotto</Label>
              <Input
                value={form.lot || ""}
                onChange={(e) => setForm((s) => ({ ...s, lot: e.target.value }))}
                placeholder="es. L2309-A"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Attributes (JSON)</Label>
              <Input
                value={form.attributes || ""}
                onChange={(e) => setForm((s) => ({ ...s, attributes: e.target.value }))}
                placeholder='{"brand":"Acme","weight":"1.2kg"}'
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Test results (JSON)</Label>
              <Input
                value={form.testResults || ""}
                onChange={(e) => setForm((s) => ({ ...s, testResults: e.target.value }))}
                placeholder='{"qualityCheck":"passed","date":"2025-10-01"}'
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreate} disabled={busy}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Pubblica VC
            </Button>
            <Button onClick={handleSupersede} variant="outline" disabled={busy || !currentVC}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Sostituisci (supersede)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* LISTA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">VC associate al prodotto</CardTitle>
          <CardDescription>Seleziona VC da includere nella VP (mock). Filtra e verifica on-demand.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3 pb-2">
            <div className="flex items-center gap-2">
              <Checkbox id="only-valid" checked={onlyValid} onCheckedChange={(c) => setOnlyValid(!!c)} />
              <Label htmlFor="only-valid">Solo valide</Label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Pick</th>
                  <th className="py-2 pr-2">Schema</th>
                  <th className="py-2 pr-2">Versione</th>
                  <th className="py-2 pr-2">Stato</th>
                  <th className="py-2 pr-2">Integrità</th>
                  <th className="py-2 pr-2">GTIN/Lot</th>
                  <th className="py-2 pr-2">Costo</th>
                  <th className="py-2 pr-2">Payer</th>
                  <th className="py-2 pr-2">Account</th>
                  <th className="py-2 pr-2">txRef</th>
                  <th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((v) => {
                  const st = (v.status || "valid") as VCStatus;
                  const d: any = (v as any).data || {};
                  const b: any = (v as any).billing || d.billing || {};
                  const checked = !!selectedIds[v.id];
                  const integOk = integrityMap[v.id] ?? (v as any).__integrityOk ?? false;
                  const cost = b.cost ?? b.amount;
                  const payerType = b.payerType;
                  const payerAccountId = b.payerAccountId ?? b.payerId;
                  const txRef = b.txRef;

                  return (
                    <tr key={v.id} className="border-b hover:bg-muted/40">
                      <td className="py-2 pr-2">
                        <Checkbox checked={checked} onCheckedChange={(c) => togglePick(v.id, !!c)} />
                      </td>
                      <td className="py-2 pr-2">{StandardsRegistry[v.schemaId as StandardId]?.title ?? v.schemaId}</td>
                      <td className="py-2 pr-2">{v.version ?? 1}</td>
                      <td className="py-2 pr-2">
                        {st === "valid" ? "✅ valid" : st === "revoked" ? "🛑 revoked" : st === "superseded" ? "↗ superseded" : st}
                      </td>
                      <td className="py-2 pr-2">
                        <VerifyFlag valid={!!integOk} />
                      </td>
                      <td className="py-2 pr-2">
                        {(d.gtin || "—")}/{d.lot || "—"}
                      </td>
                      <td className="py-2 pr-2">{cost != null ? `${cost}` : "—"}</td>
                      <td className="py-2 pr-2">{payerType ?? "—"}</td>
                      <td className="py-2 pr-2 font-mono text-xs">{payerAccountId ?? "—"}</td>
                      <td className="py-2 pr-2 font-mono text-xs">
                        {txRef ? (
                          <Link className="underline" to={historyLinkForTx(txRef)} title="Vedi in storico crediti">
                            {txRef}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => handleVerify(v)} disabled={verifyingId === v.id}>
                            <BadgeCheck className="h-4 w-4 mr-1" />
                            {verifyingId === v.id ? "Verifica…" : "Verifica"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportVC(v, `product_${productId}_${v.schemaId || "VC"}`)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export VC
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {tableRows.length === 0 && (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={11}>
                      Nessuna VC trovata per questo prodotto.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={downloadVP} disabled={busy || Object.values(selectedIds).every((x) => !x)}>
              <FileJson className="h-4 w-4 mr-2" />
              Crea VP (mock) e scarica
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PREVIEW */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Dettaglio VC {integrity ? (integrity.valid ? "✅" : "❌") : ""}
            </CardTitle>
            {integrity && (
              <CardDescription className="font-mono break-all">
                expected={integrity.expectedHash} · actual={integrity.actualHash}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <CopyJsonBox json={preview} filename={`product-vc-${preview.id}.json`} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
