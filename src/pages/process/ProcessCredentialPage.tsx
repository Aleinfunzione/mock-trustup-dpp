// src/pages/process/ProcessCredentialPage.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";
import type { VC, VCStatus } from "@/types/vc";
import {
  createProcessVC,
  listVCs,
  revokeVC,
  supersedeVC,
  verifyIntegrity,
} from "@/services/api/vc";
import { exportVC, exportVP } from "@/services/standards/export";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown, Check, BadgeCheck, Ban, RefreshCcw, PlusCircle, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";
import VerifyFlag from "@/components/vc/VerifyFlag";
import CopyJsonBox from "@/components/vc/CopyJsonBox";

/* ----------------------------- Types & helpers ----------------------------- */

type ProcForm = {
  processId: string;
  islandId?: string;
  site?: string;
  certificateId?: string;
  validFrom?: string; // YYYY-MM-DD
  validUntil?: string; // YYYY-MM-DD
};

const ALL_STANDARDS = Object.keys(StandardsRegistry) as StandardId[];
const DEFAULT_STD: StandardId = (ALL_STANDARDS.includes("ISO9001" as StandardId) ? "ISO9001" : ALL_STANDARDS[0]) as StandardId;

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
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {current ? current.label : "Seleziona standard"}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 min-w-[280px]">
        <Command>
          <CommandInput placeholder="Cerca standard..." />
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

/* -------------------------------- Component -------------------------------- */

export default function ProcessCredentialPage() {
  const [standard, setStandard] = React.useState<StandardId>(DEFAULT_STD);
  const [busy, setBusy] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  // filtri local UI
  const [islandFilter, setIslandFilter] = React.useState<string>("");

  // form
  const [form, setForm] = React.useState<ProcForm>({
    processId: "",
    islandId: "",
    site: "",
    certificateId: "",
    validFrom: "",
    validUntil: "",
  });

  const [list, setList] = React.useState<VC[]>([]);
  const [preview, setPreview] = React.useState<VC | null>(null);
  const [integrity, setIntegrity] = React.useState<{ valid: boolean; expectedHash: string; actualHash: string } | null>(
    null
  );

  const selectedStandardLabel = StandardsRegistry[standard]?.title ?? standard;

  const currentVC = React.useMemo(() => {
    const same = list.filter((v) => v.schemaId === standard && v.subjectId === form.processId);
    if (!same.length) return undefined;
    return same
      .slice()
      .sort((a, b) => (b.version ?? 0) - (a.version ?? 0) || (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0];
  }, [list, standard, form.processId]);

  async function reload() {
    setBusy(true);
    setErrorMsg(null);
    try {
      const out = await listVCs({ subjectType: "process" });

      // integrità per tabella
      const withIntegrity: VC[] = [];
      for (const v of out) {
        try {
          const res = await verifyIntegrity(v.id);
          (v as any).__integrityOk = !!res?.valid;
        } catch {
          (v as any).__integrityOk = false;
        }
        withIntegrity.push(v);
      }

      setList(withIntegrity);
    } catch (e: any) {
      setErrorMsg(e?.message || "Errore caricamento VC");
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    void reload();
  }, []); // eslint-disable-line

  React.useEffect(() => {
    setPreview(null);
    setIntegrity(null);
    setOkMsg(null);
    setErrorMsg(null);
  }, [standard, form.processId]);

  function validateForm() {
    if (!form.processId) throw new Error("processId obbligatorio");
    if (form.validFrom && form.validUntil) {
      const d1 = new Date(`${form.validFrom}T00:00:00`);
      const d2 = new Date(`${form.validUntil}T00:00:00`);
      if (d1 > d2) throw new Error("Intervallo date non valido");
    }
  }

  async function handleCreate() {
    try {
      setBusy(true);
      setErrorMsg(null);
      setOkMsg(null);
      validateForm();
      const vc = await createProcessVC({
        schemaId: standard,
        issuerDid: "did:mock:issuer",
        subjectId: form.processId,
        data: {
          processId: form.processId,
          islandId: form.islandId,
          site: form.site,
          standard,
          certificateId: form.certificateId,
          validFrom: form.validFrom,
          validUntil: form.validUntil,
        },
      });
      setPreview(vc);
      await reload();
      setOkMsg("VC di processo pubblicata");
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
        processId: form.processId,
        islandId: form.islandId,
        site: form.site,
        standard,
        certificateId: form.certificateId,
        validFrom: form.validFrom,
        validUntil: form.validUntil,
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
      const res = await verifyIntegrity(target.id);
      setIntegrity(res);
      setPreview(target);
      setOkMsg(res.valid ? "Integrità: OK" : "Integrità: NON valida");
    } catch (e: any) {
      setErrorMsg(e?.message || "Errore verifica");
    } finally {
      setBusy(false);
    }
  }

  function handleExportVPFiltered() {
    const vcs = list
      .filter((v) => v.schemaId === standard)
      .filter((v) => (islandFilter ? (v as any).data?.islandId === islandFilter : true));

    const vp = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      holder: "process:table-filter",
      verifiableCredential: vcs,
      meta: {
        scope: "process",
        standard,
        islandFilter: islandFilter || null,
        generatedAt: new Date().toISOString(),
      },
    };
    exportVP(vp, `process_${standard}`);
  }

  const tableRows = React.useMemo(() => {
    return list
      .filter((v) => v.schemaId === standard)
      .filter((v) => (islandFilter ? (v as any).data?.islandId === islandFilter : true))
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }, [list, standard, islandFilter]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Credenziali di processo</CardTitle>
          <CardDescription>Gestisci VC di processo per linea/isola e sito produttivo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Standard</Label>
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
                Schema: <span className="font-mono">{StandardsRegistry[standard]?.schemaPath ?? "—"}</span>
              </div>
            </div>
            <div>
              <Label>Filtro isola/linea</Label>
              <Input
                placeholder="islandId"
                value={islandFilter}
                onChange={(e) => setIslandFilter(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button asChild variant="outline" disabled={busy}>
                <Link to="/creator/events">Indietro</Link>
              </Button>
              <Button onClick={handleExportVPFiltered} disabled={busy || tableRows.length === 0}>
                <FileJson className="h-4 w-4 mr-2" />
                Export VP (filtro)
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
          <CardTitle className="text-base">Dati VC — {selectedStandardLabel}</CardTitle>
          <CardDescription>Processo, isola/linea, sede e validità.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Process ID</Label>
              <Input
                value={form.processId}
                onChange={(e) => setForm((s) => ({ ...s, processId: e.target.value }))}
                placeholder="es. PROC-001"
              />
            </div>
            <div>
              <Label>Island/Line ID</Label>
              <Input
                value={form.islandId || ""}
                onChange={(e) => setForm((s) => ({ ...s, islandId: e.target.value }))}
                placeholder="es. ISL-A"
              />
            </div>
            <div>
              <Label>Site</Label>
              <Input
                value={form.site || ""}
                onChange={(e) => setForm((s) => ({ ...s, site: e.target.value }))}
                placeholder="es. Plant 1"
              />
            </div>
            <div>
              <Label>Certificate ID</Label>
              <Input
                value={form.certificateId || ""}
                onChange={(e) => setForm((s) => ({ ...s, certificateId: e.target.value }))}
                placeholder="es. CERT-123"
              />
            </div>
            <div>
              <Label>Valid from</Label>
              <Input
                type="date"
                value={form.validFrom || ""}
                onChange={(e) => setForm((s) => ({ ...s, validFrom: e.target.value }))}
              />
            </div>
            <div>
              <Label>Valid until</Label>
              <Input
                type="date"
                value={form.validUntil || ""}
                onChange={(e) => setForm((s) => ({ ...s, validUntil: e.target.value }))}
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
            <Button onClick={handleRevoke} variant="destructive" disabled={busy || !currentVC}>
              <Ban className="h-4 w-4 mr-2" />
              Revoca VC
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* LISTA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">VC di processo</CardTitle>
          <CardDescription>Filtro locale per isola/linea. Ordinato per aggiornamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Process</th>
                  <th className="py-2 pr-2">Isola</th>
                  <th className="py-2 pr-2">Sito</th>
                  <th className="py-2 pr-2">Versione</th>
                  <th className="py-2 pr-2">Stato</th>
                  <th className="py-2 pr-2">Integrità</th>
                  <th className="py-2 pr-2">Validità</th>
                  <th className="py-2 pr-2">Costo</th>
                  <th className="py-2 pr-2">Payer</th>
                  <th className="py-2 pr-2">txRef</th>
                  <th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((v) => {
                  const st = (v.status || "valid") as VCStatus;
                  const d: any = (v as any).data || {};
                  const billing = d.billing ?? (v as any).billing;
                  const payer = billing?.payerType;
                  return (
                    <tr key={v.id} className="border-b hover:bg-muted/40">
                      <td className="py-2 pr-2 font-mono">{v.subjectId}</td>
                      <td className="py-2 pr-2">{d.islandId ?? "—"}</td>
                      <td className="py-2 pr-2">{d.site ?? "—"}</td>
                      <td className="py-2 pr-2">{v.version ?? 1}</td>
                      <td className="py-2 pr-2">
                        {st === "valid" ? "✅ valid" : st === "revoked" ? "🛑 revoked" : st === "superseded" ? "↗ superseded" : st}
                      </td>
                      <td className="py-2 pr-2">
                        <VerifyFlag valid={(v as any).__integrityOk ?? false} />
                      </td>
                      <td className="py-2 pr-2">
                        {d.validFrom ? `${d.validFrom} → ${d.validUntil ?? "—"}` : "—"}
                      </td>
                      <td className="py-2 pr-2">{billing?.amount != null ? `${billing.amount}` : "—"}</td>
                      <td className="py-2 pr-2">{payer ?? "—"}</td>
                      <td className="py-2 pr-2 font-mono text-xs">{billing?.txRef ?? "—"}</td>
                      <td className="py-2 pr-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => handleVerify(v)}>
                            <BadgeCheck className="h-4 w-4 mr-1" />
                            Verifica
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportVC(v, `process_${standard}_v${v.version ?? 1}`)}
                          >
                            <FileJson className="h-4 w-4 mr-1" />
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
                      Nessuna VC di processo trovata.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
            <CopyJsonBox json={preview} filename={`process-vc-${preview.id}.json`} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
