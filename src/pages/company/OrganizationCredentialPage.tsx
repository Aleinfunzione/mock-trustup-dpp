// src/pages/company/OrganizationCredentialPage.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";
import { useCredentialStore } from "@/stores/credentialStore";
import { useAuthStore } from "@/stores/authStore";
import type { VerifiableCredential } from "@/domains/credential/entities";
import { verifyVC } from "@/domains/credential/services";
import OrgCredentialForm, { OrgCredValue } from "@/components/credentials/OrgCredentialForm";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type OrgStandard = Extract<StandardId, "ISO9001" | "ISO14001" | "TUV">;
const ORG_STANDARDS: readonly OrgStandard[] = ["ISO9001", "ISO14001", "TUV"] as const;

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
  const { org, upsertOrgVC, load } = useCredentialStore();

  const [standard, setStandard] = React.useState<OrgStandard>("ISO9001");
  const selectedStandardLabel = StandardsRegistry[standard].title;

  const existingVC: VerifiableCredential<any> | undefined = org?.[standard];

  const [form, setForm] = React.useState<OrgCredValue>({
    certificationNumber: existingVC?.credentialSubject?.certificationNumber ?? "",
    issuingBody: existingVC?.credentialSubject?.issuingBody ?? "",
    validFrom: existingVC?.credentialSubject?.validFrom ?? "",
    validUntil: existingVC?.credentialSubject?.validUntil ?? "",
    scopeStatement: existingVC?.credentialSubject?.scopeStatement ?? "",
    evidenceLink: existingVC?.credentialSubject?.evidenceLink ?? "",
  });

  const [validMsg, setValidMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [previewVC, setPreviewVC] = React.useState<VerifiableCredential<any> | null>(null);
  const [verifStatus, setVerifStatus] = React.useState<"idle" | "valid" | "invalid">("idle");
  const [busy, setBusy] = React.useState<boolean>(false);

  React.useEffect(() => {
    load?.();
  }, [load]);

  React.useEffect(() => {
    setForm({
      certificationNumber: existingVC?.credentialSubject?.certificationNumber ?? "",
      issuingBody: existingVC?.credentialSubject?.issuingBody ?? "",
      validFrom: existingVC?.credentialSubject?.validFrom ?? "",
      validUntil: existingVC?.credentialSubject?.validUntil ?? "",
      scopeStatement: existingVC?.credentialSubject?.scopeStatement ?? "",
      evidenceLink: existingVC?.credentialSubject?.evidenceLink ?? "",
    });
    setValidMsg(null);
    setErrorMsg(null);
    setPreviewVC(null);
    setVerifStatus("idle");
  }, [standard, existingVC?.credentialSubject]);

  async function handleSaveAndSign() {
    try {
      setBusy(true);
      setErrorMsg(null);
      setValidMsg(null);
      setPreviewVC(null);
      setVerifStatus("idle");

      if (!issuerDid) throw new Error("Issuer DID non disponibile");
      if (!form.certificationNumber || !form.issuingBody || !form.validFrom || !form.validUntil) {
        throw new Error("Campi obbligatori mancanti");
      }
      if (new Date(`${form.validFrom}T00:00:00`) > new Date(`${form.validUntil}T00:00:00`)) {
        throw new Error("Intervallo date non valido");
      }

      const vc: VerifiableCredential<any> = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", `Org${standard}`],
        issuer: issuerDid,
        issuanceDate: new Date().toISOString(),
        credentialSubject: { ...form },
        proof: { type: "Ed25519Signature2020", created: new Date().toISOString() } as any,
      };

      const ver = await verifyVC(vc);
      upsertOrgVC(standard, vc);
      setPreviewVC(vc);
      setVerifStatus(ver.valid ? "valid" : "invalid");
      setValidMsg(ver.valid ? "VC firmata e verificata" : "VC firmata ma NON verificata");
    } catch (err: any) {
      setErrorMsg(err?.message || "Errore creazione VC");
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyExisting() {
    try {
      setBusy(true);
      setErrorMsg(null);
      setValidMsg(null);
      setPreviewVC(null);
      setVerifStatus("idle");

      if (!existingVC) throw new Error("Nessuna VC esistente per questo standard");
      const ver = await verifyVC(existingVC);
      setVerifStatus(ver.valid ? "valid" : "invalid");
      setValidMsg(ver.valid ? "VC esistente: verificata" : "VC esistente: NON verificata");
      setPreviewVC(existingVC);
      setForm(existingVC.credentialSubject || {});
    } catch (err: any) {
      setErrorMsg(err?.message || "Errore verifica VC");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Credenziali organizzazione</CardTitle>
          <CardDescription>Gestisci ISO9001, ISO14001, TÜV come VC.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Standard</Label>
              <StandardCombobox
                value={standard}
                onChange={(v) => setStandard(v)}
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

          <div className="flex gap-2">
            <Button asChild variant="outline" disabled={busy}>
              <Link to="/company/compliance">Indietro</Link>
            </Button>
            <Button variant="secondary" onClick={onVerifyExisting} disabled={busy || !existingVC}>
              Verifica VC esistente
            </Button>
          </div>
        </CardContent>
      </Card>

      {errorMsg && <div className="text-sm text-destructive">{errorMsg}</div>}
      {validMsg && <div className="text-sm">{validMsg}</div>}

      <OrgCredentialForm
        standardLabel={selectedStandardLabel}
        issuerDid={issuerDid}
        value={form}
        onChange={setForm}
        onSubmit={handleSaveAndSign}
        submitting={busy}
      />

      {previewVC && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              VC generata {verifStatus === "valid" ? "✅" : verifStatus === "invalid" ? "❌" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs p-3 rounded border overflow-auto bg-muted/30">
{JSON.stringify(previewVC, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
