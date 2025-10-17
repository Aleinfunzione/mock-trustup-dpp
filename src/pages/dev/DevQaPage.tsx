// src/pages/dev/DevQaPage.tsx  (aggiunte principali)
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/components/ui/use-toast";
import { runDevSeed } from "@/storage/devSeed";

export default function DevQaPage() {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [adminDid, setAdminDid] = React.useState(currentUser?.did || "");
  const [companyDid, setCompanyDid] = React.useState(currentUser?.companyDid || "");
  const [busy, setBusy] = React.useState(false);
  const [log, setLog] = React.useState<string>("");

  async function handleSeed() {
    if (!adminDid || !companyDid) {
      toast({ title: "Specifica adminDid e companyDid", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await runDevSeed({ adminDid, companyDid });
      const lines = [
        `OK: ${res.ok}`,
        ...(res.notes || []).map((x) => `• ${x}`),
        ...(res.errors || []).map((x) => `! ${x}`),
        res.orgVC ? `OrgVC: ${res.orgVC.id}` : "",
        res.procVC ? `ProcessVC: ${res.procVC.id}` : "",
        res.productVC ? `ProductVC: ${res.productVC.id}` : "",
      ].filter(Boolean);
      setLog(lines.join("\n"));
      toast({ title: res.ok ? "Seed completato" : "Seed con errori" });
    } catch (e: any) {
      toast({ title: "Errore seed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ...contenuti esistenti... */}

      <Card>
        <CardHeader>
          <CardTitle>Seed QA rapido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Admin DID</div>
              <Input value={adminDid} onChange={(e) => setAdminDid(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Company DID</div>
              <Input value={companyDid} onChange={(e) => setCompanyDid(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSeed} disabled={busy}>Esegui seed</Button>
          </div>
          {log && (
            <pre className="mt-2 whitespace-pre-wrap text-xs p-2 bg-muted rounded border">{log}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
