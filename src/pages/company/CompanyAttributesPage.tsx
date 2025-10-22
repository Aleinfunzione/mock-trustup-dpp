// src/pages/company/CompanyAttributesPage.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { getActor } from "@/services/api/identity";
import {
  getCompanyAttrs,
  setCompanyAttrs,
  type CompanyAttributes,
} from "@/services/api/companyAttributes";

/* ============================ Esempio JSON ============================ */

const EXAMPLE_JSON = JSON.stringify(
  {
    vLEI: "984500A1B2C3D4E5F6G7",
    islands: [
      {
        id: "is-1",
        name: "Linea A",
        machines: [{ id: "m-1", name: "Pressa A1" }],
        shifts: [{ id: "s1", name: "Giorno", from: "06:00", to: "14:00" }],
        energyMeters: [{ id: "em-1", model: "EM-3000" }],
        notes: "Linea principale",
      },
    ],
    compliance: [
      { key: "countryOfOrigin", label: "Paese origine", type: "string", required: true },
      { key: "hazardous", label: "Pericoloso", type: "boolean" },
      {
        key: "eprCategory",
        label: "Categoria EPR",
        type: "select",
        options: [{ value: "A" }, { value: "B" }],
      },
    ],
  },
  null,
  2
);

/* ================================ Page ================================ */

export default function CompanyAttributesPage() {
  const { currentUser } = useAuth();
  const actor = currentUser?.did ? getActor(currentUser.did) : undefined;
  const companyDid = currentUser?.companyDid ?? actor?.companyDid;

  const [jsonText, setJsonText] = React.useState<string>("{}");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  // Bootstrap: carica gli attributi aziendali tramite service (gestisce migrazione)
  React.useEffect(() => {
    if (!companyDid) {
      setJsonText("{}");
      return;
    }
    const attrs = getCompanyAttrs(companyDid);
    setJsonText(JSON.stringify(attrs, null, 2));
  }, [companyDid]);

  function handleFormat() {
    try {
      const parsed = JSON.parse(jsonText || "{}");
      setJsonText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      setError("JSON non valido: impossibile formattare.");
    }
  }

  function handleClear() {
    setJsonText("{}");
    setError(null);
    setOk(null);
  }

  function handleExample() {
    setJsonText(EXAMPLE_JSON);
    setError(null);
    setOk(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setOk(null);
      if (!companyDid) throw new Error("Azienda non rilevata per questo account.");

      let parsed: unknown = {};
      if (jsonText && jsonText.trim()) {
        try {
          parsed = JSON.parse(jsonText);
        } catch {
          throw new Error("Il contenuto non è un JSON valido.");
        }
      }

      // Permettiamo solo i campi del contratto CompanyAttributes
      const { vLEI, islands, compliance } = (parsed as CompanyAttributes) ?? {};
      const payload: CompanyAttributes = {
        vLEI,
        islands,
        compliance,
      };

      const saved = setCompanyAttrs(companyDid, payload);
      setJsonText(JSON.stringify(saved, null, 2));
      setOk("Salvato.");
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
            Struttura unica supportata: <code>{`{ vLEI, islands, compliance }`}</code>. I dati sono locali (mock) e
            alimentano form prodotto e DPP.
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
                  placeholder='{"vLEI":"...","islands":[...],"compliance":[...]}'
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleFormat}>
                    Format JSON
                  </Button>
                  <Button variant="outline" onClick={handleExample}>
                    Inserisci esempio
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

              <div className="text-xs text-muted-foreground space-y-2">
                <div>
                  <b>vLEI</b>: codice vLEI aziendale (opzionale).
                </div>
                <div>
                  <b>islands</b>: linee/isole con macchine, turni e contatori energia.
                </div>
                <div>
                  <b>compliance</b>: definizioni degli attributi compilativi per i prodotti. Esempio:
                </div>
                <pre className="mt-1 rounded bg-muted p-2 text-[11px] overflow-x-auto">
{`{
  "compliance": [
    { "key":"countryOfOrigin","label":"Paese origine","type":"string","required":true },
    { "key":"hazardous","label":"Pericoloso","type":"boolean" },
    { "key":"eprCategory","label":"Categoria EPR","type":"select","options":[{"value":"A"},{"value":"B"}] }
  ]
}`}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
