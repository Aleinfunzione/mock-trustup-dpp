// src/pages/credentials/OrganizationCredentialPage.tsx
import * as React from "react";
import VCCreator from "@/components/credentials/VCCreator";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canAfford, costOf } from "@/services/orchestration/creditsPublish";

export default function OrganizationCredentialPage() {
  const { currentUser } = useAuthStore();
  const subjectId = currentUser?.companyDid || currentUser?.did || "";
  const issuerDid = currentUser?.companyDid || currentUser?.did || "";

  const [canPay, setCanPay] = React.useState(true);
  const vcCost = costOf("VC_CREATE" as any);

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
  }, [currentUser?.did, currentUser?.companyDid]);

  if (!subjectId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contesto mancante</CardTitle>
          <CardDescription>Nessun DID disponibile per l’azienda o l’utente.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Credenziali organizzazione</CardTitle>
          <CardDescription>Emetti VC per l’organizzazione corrente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Issuer DID</Label>
              <Input value={issuerDid} readOnly className="font-mono" />
            </div>
            <div className="self-end text-xs text-muted-foreground">
              Costo azione: <span className="font-mono">{vcCost}</span> crediti
              {!canPay && <span className="text-destructive ml-2">• crediti insufficienti</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <VCCreator subjectId={subjectId} subjectType="organization" />
    </div>
  );
}
