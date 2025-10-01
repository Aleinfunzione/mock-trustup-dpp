// src/pages/company/OrganizationCredentialPage.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";
import { loadSchema } from "@/services/schema/loader";
import { validateStandard } from "@/services/schema/validate";
import { useCredentialStore } from "@/stores/credentialStore";
import { useAuthStore } from "@/stores/authStore";
import type { VerifiableCredential } from "@/domains/credential/entities";
import { verifyVC } from "@/domains/credential/services";

// RJSF v5 + validator AJV8
import Form from "@rjsf/core";
import type { IChangeEvent } from "@rjsf/core";
import validatorAjv8 from "@rjsf/validator-ajv8";

type Schema = Record<string, any>;
type OrgStandard = Extract<StandardId, "ISO9001" | "ISO14001" | "TUV">;
const ORG_STANDARDS: readonly OrgStandard[] = ["ISO9001", "ISO14001", "TUV"] as const;

export default function OrganizationCredentialPage() {
  const { currentUser } = useAuthStore();
  const issuerDid = currentUser?.companyDid || currentUser?.did || "";

  const { org, upsertOrgVC, load } = useCredentialStore();

  const [standard, setStandard] = React.useState<OrgStandard>("ISO9001");
  const [schema, setSchema] = React.useState<Schema | null>(null);

  const existingVC: VerifiableCredential<any> | undefined = org?.[standard];

  const [formData, setFormData] = React.useState<any>({});
  const [validMsg, setValidMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [previewVC, setPreviewVC] = React.useState<VerifiableCredential<any> | null>(null);
  const [verifStatus, setVerifStatus] = React.useState<"idle" | "valid" | "invalid">("idle");
  const [busy, setBusy] = React.useState<boolean>(false);

  React.useEffect(() => {
    load?.();
  }, [load]);

  React.useEffect(() => {
    let alive = true;
    async function run() {
      setSchema(null);
      setValidMsg(null);
      setErrorMsg(null);
      setPreviewVC(null);
      setVerifStatus("idle");
      try {
        const path = StandardsRegistry[standard].schemaPath;
        const s = await loadSchema(path);
        if (!alive) return;
        setSchema(s);
        setFormData(existingVC?.credentialSubject ?? {});
      } catch (e: any) {
        if (!alive) return;
        setErrorMsg(e?.message || "Errore caricamento schema");
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [standard, existingVC]);

  async function handleValidateLive(nextData: any) {
    const res = await validateStandard(standard, nextData);
    if (res.ok) setValidMsg("Schema OK");
    else {
      const msgs =
        res.errors?.slice(0, 3).map((e) => `${e.message}${e.instancePath ? ` @ ${e.instancePath}` : ""}`) || [];
      setValidMsg(msgs.length ? `Errori: ${msgs.join(" | ")}` : "Schema non valido");
    }
  }

  function onFormChange(e: IChangeEvent) {
    setFormData(e.formData || {});
    handleValidateLive(e.formData).catch(() => void 0);
  }

  async function onSubmit(e: IChangeEvent) {
    setBusy(true);
    setErrorMsg(null);
    setValidMsg(null);
    setPreviewVC(null);
    setVerifStatus("idle");
    try {
      if (!issuerDid) throw new Error("Issuer DID non disponibile");

      // VC mock minimale; il signer reale del dominio può sostituire questa parte.
      const vc: VerifiableCredential<any> = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", `Org${standard}`],
        issuer: { id: issuerDid },
        issuanceDate: new Date().toISOString(),
        credentialSubject: e.formData,
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
    setBusy(true);
    setErrorMsg(null);
    setValidMsg(null);
    setPreviewVC(null);
    setVerifStatus("idle");
    try {
      if (!existingVC) throw new Error("Nessuna VC esistente per questo standard");
      const ver = await verifyVC(existingVC);
      setVerifStatus(ver.valid ? "valid" : "invalid");
      setValidMsg(ver.valid ? "VC esistente: verificata" : "VC esistente: NON verificata");
      setPreviewVC(existingVC);
      setFormData(existingVC.credentialSubject || {});
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
              <select
                className="w-full border rounded h-9 bg-background"
                value={standard}
                onChange={(e) => setStandard(e.target.value as OrgStandard)}
                disabled={busy}
              >
                {ORG_STANDARDS.map((id) => (
                  <option key={id} value={id}>
                    {StandardsRegistry[id].title} [{id}]
                  </option>
                ))}
              </select>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dati credenziale — {StandardsRegistry[standard].title}</CardTitle>
          <CardDescription>Compila i campi richiesti e salva per firmare la VC.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {errorMsg && <div className="text-sm text-destructive">{errorMsg}</div>}
          {validMsg && <div className="text-sm">{validMsg}</div>}
          {!schema && <div className="text-sm text-muted-foreground">Caricamento schema…</div>}
          {schema && (
            <Form
              schema={schema as any}
              formData={formData}
              onChange={onFormChange}
              onSubmit={onSubmit}
              validator={validatorAjv8}
              liveValidate={false}
              noHtml5Validate
            >
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>Salva e firma VC</Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setFormData({})}>
                  Reset
                </Button>
              </div>
            </Form>
          )}
        </CardContent>
      </Card>

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
