// src/pages/company/CompanyCompliancePage.tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StandardsRegistry } from "@/config/standardsRegistry";
import { useCredentialStore } from "@/stores/credentialStore";
import { useComplianceStore } from "@/stores/complianceStore";

function StatusBadge({ ok }: { ok: boolean }) {
  // shadcn/ui Badge non ha "success". Usiamo variant default + classi.
  if (ok) {
    return (
      <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-600/30">
        ✅ OK
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
      ⚠️ Mancante
    </Badge>
  );
}

export default function CompanyCompliancePage() {
  const { org, load } = useCredentialStore();
  const { reset } = useComplianceStore(); // product-scope, non usato qui

  React.useEffect(() => {
    load?.();
    reset?.();
  }, [load, reset]);

  const standardsOrg = Object.values(StandardsRegistry).filter((s) => s.scope === "organization");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compliance aziendale</CardTitle>
          <CardDescription>
            Stato delle credenziali d’organizzazione richieste dagli standard registrati.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {standardsOrg.length === 0 && (
            <div className="text-sm text-muted-foreground">Nessuno standard registrato lato organizzazione.</div>
          )}

          {standardsOrg.map((std) => {
            const vc = org?.[std.id as keyof typeof org];
            const present = Boolean(vc);
            return (
              <div key={std.id} className="flex items-start justify-between gap-4 border rounded p-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {std.title} <span className="text-xs text-muted-foreground font-mono">[{std.id}]</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Schema: <span className="font-mono">{std.schemaPath}</span>
                    {" · "}Campi richiesti: <span className="font-mono">{std.requiredFields.join(", ")}</span>
                  </div>
                  {present && (
                    <pre className="text-[11px] p-2 rounded border overflow-auto bg-muted/30 max-h-40">
{JSON.stringify(vc, null, 2)}
                    </pre>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 min-w-[160px]">
                  <StatusBadge ok={present} />
                  {/* Placeholder: in attesa del form VC org dedicato */}
                  {!present ? (
                    <Button asChild size="sm" variant="outline" title="Aggiungi credenziale organizzazione">
                      <Link to="/company/attributes">Aggiungi VC</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="secondary" title="Aggiorna credenziale organizzazione">
                      <Link to="/company/attributes">Aggiorna VC</Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suggerimenti</CardTitle>
          <CardDescription>Completa le VC di organizzazione prima delle VP di prodotto.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Le VP di prodotto richiedono VC di organizzazione per passare il gate di compliance.</p>
          <p>
            Dopo aver aggiunto le VC, usa la pagina Prodotto → <span className="font-medium">Credenziali</span> per inserire
            GS1 o EU DPP e pubblicare la VP dal viewer.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
