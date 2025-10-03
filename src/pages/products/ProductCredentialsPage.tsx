// src/pages/products/ProductCredentialsPage.tsx
import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";
import { loadSchema } from "@/services/schema/loader";
import { validateStandard } from "@/services/schema/validate";
import { useCredentialStore } from "@/stores/credentialStore";
import { createProductVC, verifyProductVC } from "@/domains/product/services";
import type { VerifiableCredential } from "@/domains/credential/entities";
import { useAuthStore } from "@/stores/authStore";
import { getProductById } from "@/services/api/products";
import { canAfford, consume, costOf } from "@/services/orchestration/creditsPublish";
import { notifyError, notifySuccess } from "@/stores/uiStore";

import Form from "@rjsf/core";
import type { IChangeEvent } from "@rjsf/core";
import validatorAjv8 from "@rjsf/validator-ajv8";

type Schema = Record<string, any>;
type ProductStandard = Extract<StandardId, "GS1" | "EU_DPP_TEXTILE" | "EU_DPP_ELECTRONICS">;
const PRODUCT_STANDARDS: readonly ProductStandard[] = ["GS1", "EU_DPP_TEXTILE", "EU_DPP_ELECTRONICS"] as const;

export default function ProductCredentialsPage() {
  const { id: productId } = useParams<{ id: string }>();
  const { currentUser } = useAuthStore();
  const issuerDid = currentUser?.companyDid || currentUser?.did || "";

  const { prod, upsertProdVC, load } = useCredentialStore();

  const [productName, setProductName] = React.useState<string>("");
  const [standard, setStandard] = React.useState<ProductStandard>("GS1");
  const [schema, setSchema] = React.useState<Schema | null>(null);

  const existingVC: VerifiableCredential<any> | undefined =
    (productId && prod?.[productId]?.[standard]) || undefined;

  const [formData, setFormData] = React.useState<any>({});
  const [validMsg, setValidMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [previewVC, setPreviewVC] = React.useState<VerifiableCredential<any> | null>(null);
  const [verifStatus, setVerifStatus] = React.useState<"idle" | "valid" | "invalid">("idle");
  const [busy, setBusy] = React.useState<boolean>(false);
  const [canPay, setCanPay] = React.useState<boolean>(true);
  const vcCost = costOf("VC_CREATE" as any);

  React.useEffect(() => {
    load?.();
  }, [load]);

  React.useEffect(() => {
    if (!productId) return;
    try {
      const p = getProductById(productId);
      setProductName((p as any)?.name || (p as any)?.title || productId);
    } catch {
      setProductName(productId);
    }
  }, [productId]);

  // Carica schema quando cambia standard
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
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standard, productId]);

  // Pre-gating crediti
  React.useEffect(() => {
    let alive = true;
    async function checkCredits() {
      if (!currentUser?.did) return setCanPay(true);
      try {
        const ok = await canAfford("VC_CREATE" as any, {
          payer: currentUser.did,
          company: currentUser.companyDid,
        } as any);
        if (alive) setCanPay(ok);
      } catch {
        if (alive) setCanPay(false);
      }
    }
    checkCredits();
    return () => { alive = false; };
  }, [currentUser?.did, currentUser?.companyDid, standard, schema]);

  async function handleValidateLive(nextData: any) {
    const res = await validateStandard(standard, nextData);
    if (res.ok) setValidMsg("Schema OK");
    else {
      const msgs = res.errors?.slice(0, 3).map(e => `${e.message}${e.instancePath ? ` @ ${e.instancePath}` : ""}`) || [];
      setValidMsg(msgs.length ? `Errori: ${msgs.join(" | ")}` : "Schema non valido");
    }
  }

  function onFormChange(e: IChangeEvent) {
    setFormData(e.formData || {});
    handleValidateLive(e.formData).catch(() => void 0);
  }

  async function onSubmit(e: IChangeEvent) {
    if (!productId) return;
    setBusy(true);
    setErrorMsg(null);
    setValidMsg(null);
    setPreviewVC(null);
    setVerifStatus("idle");
    try {
      if (!issuerDid) throw new Error("Issuer DID non disponibile");
      if (!currentUser?.did) throw new Error("Contesto utente non disponibile");

      // Gate crediti
      const afford = await canAfford("VC_CREATE" as any, {
        payer: currentUser.did,
        company: currentUser.companyDid,
      } as any);
      if (!afford) {
        setCanPay(false);
        throw Object.assign(new Error("Crediti insufficienti"), { code: "INSUFFICIENT_CREDITS" });
      }

      // Consume prima della creazione
      await consume("VC_CREATE" as any, {
        payer: currentUser.did,
        company: currentUser.companyDid,
      } as any, { kind: "vc", productId, standard });

      const vc = await createProductVC({ standard, issuerDid, subject: e.formData });
      upsertProdVC(productId, standard, vc);
      setPreviewVC(vc);

      const ver = await verifyProductVC(vc);
      setVerifStatus(ver.valid ? "valid" : "invalid");
      setValidMsg(ver.valid ? "VC firmata e verificata" : "VC firmata ma NON verificata");

      notifySuccess("VC emessa", `Azione VC_CREATE consumata (${vcCost} crediti).`);
    } catch (err: any) {
      const msg = err?.message || "Errore creazione VC";
      setErrorMsg(msg);
      notifyError(err, "Impossibile emettere la VC");
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
      const ver = await verifyProductVC(existingVC);
      setVerifStatus(ver.valid ? "valid" : "invalid");
      setValidMsg(ver.valid ? "VC esistente: verificata" : "VC esistente: NON verificata");
      setPreviewVC(existingVC);
      setFormData(existingVC.credentialSubject || {});
    } catch (err: any) {
      setErrorMsg(err?.message || "Errore verifica VC");
      notifyError(err, "Errore verifica VC");
    } finally {
      setBusy(false);
    }
  }

  if (!productId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prodotto non specificato</CardTitle>
          <CardDescription>Route senza parametro :id.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline"><Link to="..">Indietro</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Credenziali prodotto</CardTitle>
          <CardDescription>
            {productName ? <span>Progetto <span className="font-mono">{productName}</span></span> : "Progetto"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Standard</Label>
              <select
                className="w-full border rounded h-9 bg-background"
                value={standard}
                onChange={(e) => setStandard(e.target.value as ProductStandard)}
                disabled={busy}
              >
                {PRODUCT_STANDARDS.map((id) => (
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

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" disabled={busy}>
              <Link to="..">Indietro</Link>
            </Button>
            <Button variant="secondary" onClick={onVerifyExisting} disabled={busy || !existingVC}>
              Verifica VC esistente
            </Button>
            <div className="ml-auto text-xs text-muted-foreground">
              Costo azione: <span className="font-mono">{vcCost}</span> crediti
              {!canPay && <span className="text-destructive ml-2">• crediti insufficienti</span>}
            </div>
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
                <Button type="submit" disabled={busy || !canPay}>Salva e firma VC</Button>
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
