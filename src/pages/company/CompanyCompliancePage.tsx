// src/pages/company/CompanyCompliancePage.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";
import { useCredentialStore } from "@/stores/credentialStore";
import { useComplianceStore } from "@/stores/complianceStore";
import { evaluateCompliance, type ComplianceReport } from "@/domains/compliance/services";

function StatusBadge({
  present,
  schemaOk,
  proofOk,
}: {
  present: boolean;
  schemaOk: boolean;
  proofOk: boolean;
}) {
  if (present && schemaOk && proofOk) {
    return (
      <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-600/30">
        ✅ OK
      </Badge>
    );
  }
  if (!present) {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
        ⚠️ Assente
      </Badge>
    );
  }
  if (!schemaOk) {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
        ⚠️ Schema
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
      ⚠️ Proof
    </Badge>
  );
}

export default function CompanyCompliancePage() {
  const { org, load } = useCredentialStore();
  const { reset } = useComplianceStore();

  const [report, setReport] = React.useState<ComplianceReport | null>(null);
  const orgStandards = React.useMemo(
    () => Object.values(StandardsRegistry).filter((s) => s.scope === "organization"),
    []
  );
  const orgRequired = React.useMemo(
    () => orgStandards.map((s) => s.id as StandardId),
    [orgStandards]
  );

  React.useEffect(() => {
    load?.();
    reset?.();
  }, [load, reset]);

  React.useEffect(() => {
    let alive = true;
    async function run() {
      const rep = await evaluateCompliance(org || {}, {}, { organizationRequired: orgRequired });
      if (!alive) return;
      setReport(rep);
    }
    run();
    return () => {
      alive = false;
    };
  }, [org, orgRequired]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compliance aziendale</CardTitle>
          <CardDescription>
            Stato delle credenziali d’organizzazione richieste e loro validità.{" "}
            <span className="text-muted-foreground">
              Le VC sono <b>complementari</b> agli <i>attributi di compliance prodotto</i> definiti in Company → Attributi
              azienda: le VC attestano, gli attributi compilano i dati di prodotto e vengono inclusi nella VP.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {orgStandards.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Nessuno standard registrato lato organizzazione.
            </div>
          )}

          {orgStandards.map((std) => {
            const vc = org?.[std.id as keyof typeof org];
            const item = report?.items.find(
              (i) => i.scope === "organization" && i.standard === (std.id as StandardId)
            );
            const present = !!item?.present;
            const schemaOk = item?.validSchema !== false && (!item?.missingFields || item?.missingFields.length === 0);
            const proofOk = item?.validProof !== false;

            return (
              <div key={std.id} className="flex items-start justify-between gap-4 border rounded p-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {std.title}{" "}
                    <span className="text-xs text-muted-foreground font-mono">[{std.id}]</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Schema: <span className="font-mono">{std.schemaPath}</span>
                    {" · "}Campi richiesti:{" "}
                    <span className="font-mono">{std.requiredFields.join(", ")}</span>
                  </div>
                  {item?.missingFields?.length ? (
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      Campi mancanti: {item.missingFields.join(", ")}
                    </div>
                  ) : null}
                  {vc && (
                    <pre className="text-[11px] p-2 rounded border overflow-auto bg-muted/30 max-h-40">
{JSON.stringify(vc, null, 2)}
                    </pre>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 min-w-[180px]">
                  <StatusBadge present={present} schemaOk={schemaOk} proofOk={proofOk} />
                  <div className="text-[11px] text-muted-foreground">
                    {present ? (
                      <>
                        <div>Schema: {schemaOk ? "OK" : "Errore"}</div>
                        <div>Proof: {proofOk ? "OK" : "Errore"}</div>
                      </>
                    ) : (
                      <div>Credenziale assente</div>
                    )}
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant={present ? "secondary" : "outline"}
                    title={present ? "Aggiorna VC" : "Aggiungi VC"}
                  >
                    <Link to={`/company/credentials?std=${encodeURIComponent(String(std.id))}`}>
                      {present ? "Aggiorna VC" : "Aggiungi VC"}
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggerimenti</CardTitle>
          <CardDescription>Completa prima le VC di organizzazione.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Le VP di prodotto passano il gate solo se le VC di organizzazione richieste risultano presenti e
            verificate.
          </p>
          <p>
            Gli <i>attributi di compliance prodotto</i> sono definiti dall’azienda e compilati a livello di prodotto.
            Non sostituiscono le VC: sono dati operativi che vengono <b>inclusi nella VP</b> e validati come “required”
            rispetto alle definizioni aziendali.
          </p>
          <p>
            Dopo aver aggiunto le VC, apri il prodotto → <span className="font-medium">Credenziali</span> per emettere
            GS1 o EU DPP e pubblicare la VP dal viewer.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
