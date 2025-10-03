// src/components/credentials/VCCreator.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import * as RegistryModule from "@/config/standardsRegistry";
import { loadSchema } from "@/services/schema/loader";
import { canAfford, consume } from "@/services/orchestration/creditsPublish";
import { notifyError, notifySuccess } from "@/stores/uiStore";

import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";

type Props = {
  subjectId: string;                          // DID org o productId
  subjectType: "organization" | "product";
  onIssued?: (vc: any) => void;
  className?: string;
};

type Template = {
  id: string;
  title: string;
  schemaPath: string;
  standard?: string;
  vcType?: string;
};

// Normalizza il registry in array
function registryToArray(mod: any): any[] {
  const src = mod?.StandardsRegistry ?? mod?.default ?? mod;
  if (Array.isArray(src)) return src;
  if (src && typeof src === "object") return Object.values(src);
  return [];
}

function listTemplates(subjectType: Props["subjectType"]): Template[] {
  const arr = registryToArray(RegistryModule);
  return arr
    .filter((x: any) => {
      const s = `${x?.title ?? ""} ${x?.standard ?? ""}`.toLowerCase();
      if (subjectType === "organization") return s.includes("iso") || s.includes("organization");
      return s.includes("gs1") || s.includes("dpp") || s.includes("product");
    })
    .map((x: any) => ({
      id: x.id ?? x?.schemaPath ?? String(x?.title ?? "vc"),
      title: x.title ?? "VC",
      schemaPath: x.schemaPath,
      standard: x.standard,
      vcType: (x.title ?? "Credential").replace(/\s+/g, ""),
    }));
}

export default function VCCreator({ subjectId, subjectType, onIssued, className }: Props) {
  const { currentUser } = useAuth();
  const [tplId, setTplId] = React.useState<string>();
  const [schema, setSchema] = React.useState<any>();
  const [formData, setFormData] = React.useState<any>({});
  const [issuing, setIssuing] = React.useState(false);
  const templates = React.useMemo(() => listTemplates(subjectType), [subjectType]);

  React.useEffect(() => {
    if (!tplId) { setSchema(undefined); setFormData({}); return; }
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl?.schemaPath) { setSchema(undefined); return; }
    loadSchema(tpl.schemaPath).then(setSchema).catch((e) => notifyError(e, "Schema non caricato"));
  }, [tplId, templates]);

  const issuerId = currentUser?.companyDid || currentUser?.did;
  const actor = currentUser?.did
    ? { payer: currentUser.did, company: currentUser.companyDid }
    : undefined;

  async function handleIssue() {
    if (!schema || !issuerId || !actor) return notifyError(new Error("MISSING_CONTEXT"), "Contesto mancante");
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) return;

    const vc = buildVC({
      issuerId,
      subjectId,
      vcType: tpl.vcType || tpl.title,
      subjectPayload: formData,
  });

    try {
      setIssuing(true);
      const afford = await canAfford("VC_CREATE" as any, actor as any);
      if (!afford) throw Object.assign(new Error("INSUFFICIENT_CREDITS"), { code: "INSUFFICIENT_CREDITS" });

      await consume("VC_CREATE" as any, actor as any, { kind: "vc", template: tpl.id });

      // TODO: firma VC secondo pipeline progetto
      onIssued?.(vc);
      notifySuccess("VC emessa", "La credenziale è stata creata.");
      setFormData({});
    } catch (e) {
      notifyError(e, "Impossibile emettere la VC");
    } finally {
      setIssuing(false);
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Nuova Verifiable Credential</CardTitle>
        <CardDescription>
          Soggetto: {subjectType === "organization" ? "Organizzazione" : "Prodotto"} • ID: <code className="text-xs">{shortId(subjectId)}</code>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <Label>Template</Label>
          <Select value={tplId} onValueChange={setTplId}>
            <SelectTrigger><SelectValue placeholder={templates.length ? "Seleziona template" : "Nessun template disponibile"} /></SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {schema && (
          <div className="space-y-2">
            <Label>Dati soggetto</Label>
            <Form
              schema={schema}
              validator={validator}
              formData={formData}
              onChange={(e) => setFormData(e.formData)}
              onSubmit={(e) => { setFormData(e.formData); }}
              showErrorList={false}
              noHtml5Validate
              liveValidate
            >
              <div style={{ display: "none" }} />
            </Form>
          </div>
        )}

        <div className="space-y-2">
          <Label>Anteprima VC (read-only)</Label>
          <Textarea readOnly className="font-mono text-xs h-40"
            value={pretty(buildVCPreview({ issuerId, subjectId, subjectType, schema, formData, tplId, templates }))} />
        </div>
      </CardContent>

      <CardFooter className="justify-between">
        <div className="text-xs text-muted-foreground">
          Issuer: <code>{shortId(issuerId)}</code>
        </div>
        <Button onClick={handleIssue} disabled={!schema || issuing || !tplId}>
          {issuing ? "Emetto…" : "Emetti VC"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function buildVC(args: { issuerId: string; subjectId: string; vcType: string; subjectPayload: any }) {
  const { issuerId, subjectId, vcType, subjectPayload } = args;
  return {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", vcType],
    issuer: { id: issuerId },
    issuanceDate: new Date().toISOString(),
    credentialSubject: { id: subjectId, ...subjectPayload },
  };
}

function buildVCPreview({
  issuerId, subjectId, subjectType, schema, formData, tplId, templates,
}: any) {
  if (!issuerId || !subjectId || !schema || !tplId) return { note: "Completa i campi per vedere l’anteprima." };
  const tpl = templates.find((t: any) => t.id === tplId);
  return buildVC({
    issuerId,
    subjectId,
    vcType: tpl?.vcType || tpl?.title || (subjectType === "organization" ? "OrgCredential" : "ProductCredential"),
    subjectPayload: formData,
  });
}

function shortId(id?: string) {
  if (!id) return "";
  return id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}

function pretty(v: any) {
  try { return JSON.stringify(v, null, 2); } catch { return ""; }
}
