// src/pages/company/OrganizationCredentialPage.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";
import { useAuthStore } from "@/stores/authStore";
import type { VC, VCStatus } from "@/types/vc";
import {
  createOrganizationVC,
  listVCs,
  revokeVC,
  supersedeVC,
  verifyIntegrity,
} from "@/services/api/vc";

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
import { exportVC, exportVP } from "@/services/standards/export";

type OrgStandard = Extract<StandardId, "ISO9001" | "ISO14001" | "TUV">;
const ORG_STANDARDS: readonly OrgStandard[] = ["ISO9001", "ISO14001", "TUV"] as const;

type OrgCredValue = {
  certificationNumber: string;
  issuingBody: string;
  validFrom: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  scopeStatement?: string;
  evidenceLink?: string;
};

function StandardCombobox({
  value,
  onChange,
  disabled,
  options,
}: {
  value: OrgStandard;
  onChange: (v: OrgStandard) => void;
  disabled?: boolean;
  options: { id: OrgStandard; label: string }[];
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
                    onChange(v as OrgStandard);
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

export default function OrganizationCredentialPage() {
  const { currentUser } = useAuthStore();
  const issuerDid = currentUser?.companyDid || currentUser?.did || "";
  const subjectId =
    (currentUser as any)?.companyId || currentUser?.companyDid || currentUser?.did || "org:default";

  const [standard, setStandard] = React.useState<OrgStandard>("ISO9001");
  const [busy, setBusy] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  // form
  const [form, setForm] = React.useState<OrgCredValue>({
    certificationNumber: "",
    issuingBody: "",
    validFrom: "",
    validUntil: "",
    scopeStatement: "",
    evidenceLink: "",
  });

  // elenco VC org (tutte) + selezione corrente per standard
  const [list, setList] = React.useState<VC[]>([]);
  const selectedSchemaId = standard as StandardId;

  const currentVC = React.useMemo(() => {
    const sameSchema = list.filter((v) => v.schemaId === selectedSchemaId);
    if (!sameSchema.length) return undefined;
    return sameSchema
      .slice()
      .sort((a, b) => (b.version ?? 0) - (a.version ?? 0) || (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      [0];
  }, [list, selectedSchemaId]);

  const [preview, setPreview] = React.useState<VC | null>(null);
  const [integrity, setIntegrity] = React.useState<{ valid: boolean; expectedHash: string; actualHash: string } | null>(
    null
  );

  // load
  async function reload() {
    setBusy(true);
    setErrorMsg(null);
    try {
      const out = await listVCs({
        subjectType: "organization",
        subjectId,
      });
      setList(out);
    } catch (e: any) {
      setErrorMsg(e?.message || "Errore caricamento VC");
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    void reload();
  }, []); // eslint-disable-line

  // cambia standard → reset form e preview
  React.useEffect(() => {
    setForm({
      certificationNumber: currentVC?.data?.certificationNumber ?? "",
      issuingBody: currentVC?.data?.issuingBody ?? "",
      validFrom: currentVC?.data?.validFrom ?? "",
      validUntil: currentVC?.data?.validUntil ?? "",
      scopeStatement: currentVC?.data?.scopeStatement ?? "",
      evidenceLink: currentVC?.data?.evidenceLink ?? "",
    });
    setPreview(null);
    setIntegrity(null);
    setOkMsg(null);
    setErrorMsg(null);
  }, [standard, currentVC?.id]);

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

  function validateForm() {
    if (!issuerDid) throw new Error("Issuer DID non disponibile");
    if (!form.certificationNumber || !form.issuingBody || !form.validFrom || !form.validUntil) {
      throw new Error("Campi obbligatori mancanti");
    }
    const d1 = new Date(`${form.validFrom}T00:00:00`);
    const d2 = new Date(`${form.validUntil}T00:00:00`);
    if (d1 > d2) throw new Error("Intervallo date non valido");
  }

  async function handleCreate() {
    try {
      setBusy(true);
      setErrorMsg(null);
      setOkMsg(null);
      validateForm();
      const vc = await createOrganizationVC({
        schemaId: selectedSchemaId,
        issuerDid,
        subjectId,
        data: { ...form },
      });
      setPreview(vc);
      await reload();
      setOkMsg("VC pubblicata");
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
      const out = await supersedeVC(currentVC.id, { ...form });
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

  function handleExportVP() {
    const vcs = list.filter((v) => v.schemaId === selectedSchemaId);
    const vp = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      holder: subjectId,
      verifiableCredential: vcs,
      meta: {
        scope: "organization",
        standard: selectedSchemaId,
        generatedAt: new Date().toISOString(),
      },
    };
    exportVP(vp, `org_${selectedSchemaId}`);
  }

  const selectedStandardLabel = StandardsRegistry[standard].title;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Credenziali organizzazione</CardTitle>
          <CardDescription>Gestisci ISO9001, ISO14001, TÜV come Verifiable Credential.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Standard</Label>
              <StandardCombobox
                value={standard}
                onChange={setStandard}
                disabled={busy}
                options={ORG_STANDARDS.map((id) => ({
                  id,
                  label: `${StandardsRegistry[id].title} [${id}]`,
                }))}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Schema: <span className="font-mono">{StandardsRegistry[standard].schemaPath}</span>
              </div>
            </div>
            <div>
              <Label>Issuer DID</Label>
              <Input value={issuerDid} readOnly className="font-mono" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" disabled={busy}>
              <Link to="/company/compliance">Indietro</Link>
            </Button>
            <Button variant="secondary" onClick={() => handleVerify()} disabled={busy || !currentVC}>
              <BadgeCheck className="h-4 w-4 mr-2" />
              Verifica VC corrente
            </Button>
            <Button variant="outline" onClick={handleExportVP} disabled={busy || !list.length}>
              <FileJson className="h-4 w-4 mr-2" />
              Export VP (schema)
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={busy || !currentVC}>
              <Ban className="h-4 w-4 mr-2" />
              Revoca VC
            </Button>
          </div>
        </CardContent>
      </Card>

      {errorMsg && <div className="text-sm text-destructive">{errorMsg}</div>}
      {okMsg && <div className="text-sm">{okMsg}</div>}

      {/* FORM DATI VC */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dati VC — {selectedStandardLabel}</CardTitle>
          <CardDescription>Compila i campi richiesti dallo schema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Certification number</Label>
              <Input
                value={form.certificationNumber}
                onChange={(e) => setForm((s) => ({ ...s, certificationNumber: e.target.value }))}
                placeholder="es. ISO-9001-ABC-2025"
              />
            </div>
            <div>
              <Label>Issuing body</Label>
              <Input
                value={form.issuingBody}
                onChange={(e) => setForm((s) => ({ ...s, issuingBody: e.target.value }))}
                placeholder="es. TÜV, SGS, DNV"
              />
            </div>
            <div>
              <Label>Valid from</Label>
              <Input
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm((s) => ({ ...s, validFrom: e.target.value }))}
              />
            </div>
            <div>
              <Label>Valid until</Label>
              <Input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm((s) => ({ ...s, validUntil: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Scope statement</Label>
              <Input
                value={form.scopeStatement || ""}
                onChange={(e) => setForm((s) => ({ ...s, scopeStatement: e.target.value }))}
                placeholder="ambito certificazione"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Evidence link</Label>
              <Input
                value={form.evidenceLink || ""}
                onChange={(e) => setForm((s) => ({ ...s, evidenceLink: e.target.value }))}
                placeholder="URL a certificato PDF"
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
            {currentVC && (
              <Button
                variant="outline"
                onClick={() => exportVC(currentVC, `org_${selectedSchemaId}_v${currentVC.version ?? 1}`)}
                disabled={busy || !currentVC}
              >
                <FileJson className="h-4 w-4 mr-2" />
                Export VC corrente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* LISTA VC ORGANIZZAZIONE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storico VC organizzazione</CardTitle>
          <CardDescription>Filtra per standard con il selettore in alto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Standard</th>
                  <th className="py-2 pr-2">Versione</th>
                  <th className="py-2 pr-2">Stato</th>
                  <th className="py-2 pr-2">Integrità</th>
                  <th className="py-2 pr-2">Issuer</th>
                  <th className="py-2 pr-2">Valido</th>
                  <th className="py-2 pr-2">Costo</th>
                  <th className="py-2 pr-2">Payer</th>
                  <th className="py-2 pr-2">txRef</th>
                  <th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {list
                  .filter((v) => v.schemaId === selectedSchemaId)
                  .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))
                  .map((v) => {
                    const st = (v.status || "valid") as VCStatus;
                    const billing = (v as any).data?.billing ?? (v as any).billing;
                    return (
                      <tr key={v.id} className="border-b hover:bg-muted/40">
                        <td className="py-2 pr-2">{StandardsRegistry[v.schemaId as OrgStandard]?.title ?? v.schemaId}</td>
                        <td className="py-2 pr-2">{v.version ?? 1}</td>
                        <td className="py-2 pr-2">
                          {st === "valid" ? "✅ valid" : st === "revoked" ? "🛑 revoked" : st}
                        </td>
                        <td className="py-2 pr-2">
                          <VerifyFlag valid={(v as any).__integrityOk ?? false} />
                        </td>
                        <td className="py-2 pr-2 font-mono">{v.issuerDid?.slice(0, 10)}…</td>
                        <td className="py-2 pr-2">
                          {v.data?.validFrom ? `${v.data.validFrom} → ${v.data.validUntil ?? "—"}` : "—"}
                        </td>
                        <td className="py-2 pr-2">{billing?.amount != null ? `${billing.amount}` : "—"}</td>
                        <td className="py-2 pr-2">{billing?.payerType ?? "—"}</td>
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
                              onClick={() => exportVC(v, `org_${v.schemaId}_v${v.version ?? 1}`)}
                            >
                              <FileJson className="h-4 w-4 mr-1" />
                              Export VC
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* PREVIEW JSON */}
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
            <CopyJsonBox json={preview} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
