import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { getActor } from "@/services/api/identity";

// Chiave LS per tutti gli attributi aziendali (mappa { [companyDid]: any })
const LS_KEY_COMPANY_ATTRS = "mock.company.attrs";

// Helpers locali (evitiamo di toccare i services adesso)
function readAllCompanyAttrs(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LS_KEY_COMPANY_ATTRS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeAllCompanyAttrs(map: Record<string, any>) {
  localStorage.setItem(LS_KEY_COMPANY_ATTRS, JSON.stringify(map));
}

export default function CompanyAttributesPage() {
  const { currentUser } = useAuth();
  const actor = currentUser?.did ? getActor(currentUser.did) : undefined;
  const companyDid = currentUser?.companyDid ?? actor?.companyDid;

  const [jsonText, setJsonText] = React.useState<string>("{}");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  // Bootstrap: carica gli attributi esistenti dell'azienda
  React.useEffect(() => {
    if (!companyDid) {
      setJsonText("{}");
      return;
    }
    const all = readAllCompanyAttrs();
    const current = all[companyDid] ?? {};
    setJsonText(JSON.stringify(current, null, 2));
  }, [companyDid]);

  function handleFormat() {
    try {
      const parsed = JSON.parse(jsonText || "{}");
      setJsonText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e: any) {
      setError("JSON non valido: impossibile formattare.");
    }
  }

  function handleClear() {
    setJsonText("{}");
    setError(null);
    setOk(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setOk(null);
      if (!companyDid) throw new Error("Azienda non rilevata per questo account.");

      let parsed: any = {};
      if (jsonText && jsonText.trim()) {
        try {
          parsed = JSON.parse(jsonText);
        } catch {
          throw new Error("Il contenuto non è un JSON valido.");
        }
      }

      // (Facoltativo) Validazione con schema AJV:
      // - in futuro: carica schema da /public/schemas/company/*.json e valida qui
      // const schema = await fetch("/schemas/company_profile.v1.json").then(r => r.json());
      // const valid = validateJson(parsed, schema); if (!valid) throw new Error("JSON non conforme allo schema");

      const all = readAllCompanyAttrs();
      all[companyDid] = parsed;
      writeAllCompanyAttrs(all);

      setOk("Salvato!");
    } catch (e: any) {
      setError(e?.message ?? "Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Attributi azienda</CardTitle>
          <CardDescription>
            Inserisci/aggiorna gli attributi della tua azienda (es. certificazioni, metadati legali, contatti, ecc.).
            I dati sono salvati in locale (mock) e saranno usati per popolare il DPP/VC nelle fasi successive.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!companyDid ? (
            <p className="text-sm text-red-500">
              Questo account non è associato ad alcuna azienda: non puoi modificare gli attributi.
            </p>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">
                Azienda: <span className="font-mono">{companyDid}</span>
              </div>

              <div className="space-y-2">
                <Label>JSON attributi</Label>
                <Textarea
                  className="h-80 font-mono"
                  placeholder='{"legalName":"Acme S.p.A.","vatNumber":"IT01234567890","isoCertifications":["ISO 9001"]}'
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleFormat}>
                    Format JSON
                  </Button>
                  <Button variant="outline" onClick={handleClear}>
                    Svuota
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Salvo…" : "Salva"}
                  </Button>
                  {ok && <span className="text-xs text-green-600">{ok}</span>}
                  {error && <span className="text-xs text-red-600">{error}</span>}
                </div>
              </div>

              {/* Suggerimento veloce su cosa mettere */}
              <div className="text-xs text-muted-foreground">
                Suggerimento: puoi includere campi come <code>legalName</code>, <code>vatNumber</code>,{" "}
                <code>address</code>, <code>contactEmail</code>, <code>isoCertifications</code>,{" "}
                <code>website</code>, <code>sustainabilityPolicy</code>. La validazione schema arriverà in seguito.
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
