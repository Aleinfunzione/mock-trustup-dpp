import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import DateField from "./DateField";

export type OrgCredValue = {
  certificationNumber?: string;
  issuingBody?: string;
  validFrom?: string;   // yyyy-mm-dd
  validUntil?: string;  // yyyy-mm-dd
  scopeStatement?: string;
  evidenceLink?: string;
};

type Props = {
  standardLabel: string;
  issuerDid: string;
  value: OrgCredValue;
  onChange: (next: OrgCredValue) => void;
  onSubmit: () => Promise<void> | void;
  submitting?: boolean;
};

export default function OrgCredentialForm({
  standardLabel,
  issuerDid,
  value,
  onChange,
  onSubmit,
  submitting,
}: Props) {
  const set = (k: keyof OrgCredValue, v: string) => onChange({ ...value, [k]: v });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dati credenziale — {standardLabel}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* intestazione */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <div className="text-sm text-muted-foreground">Issuer DID</div>
            <Input value={issuerDid} readOnly className="font-mono" />
          </div>
          <div className="grid gap-1">
            <div className="text-sm text-muted-foreground">Certification Number *</div>
            <Input
              placeholder="es. ISO9001-12345"
              value={value.certificationNumber ?? ""}
              onChange={(e) => set("certificationNumber", e.target.value)}
            />
          </div>
        </div>

        <Separator />

        {/* organismo + periodo */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <div className="text-sm text-muted-foreground mb-1">Issuing Body *</div>
            <Input
              placeholder="es. TÜV, DNV, SGS…"
              value={value.issuingBody ?? ""}
              onChange={(e) => set("issuingBody", e.target.value)}
            />
          </div>
          <div className="sm:col-span-1">
            <DateField
              label="Valida dal *"
              value={value.validFrom}
              onChange={(d) => set("validFrom", d)}
              required
            />
          </div>
          <div className="sm:col-span-1">
            <DateField
              label="Valida fino a *"
              value={value.validUntil}
              onChange={(d) => set("validUntil", d)}
              required
            />
          </div>
        </div>

        {/* scope + evidenza */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <div className="text-sm text-muted-foreground mb-1">Scope statement</div>
            <Textarea
              placeholder="Ambito di applicazione della certificazione…"
              rows={5}
              value={value.scopeStatement ?? ""}
              onChange={(e) => set("scopeStatement", e.target.value)}
            />
          </div>
          <div className="sm:col-span-1">
            <div className="text-sm text-muted-foreground mb-1">Evidence link</div>
            <Input
              placeholder="URL a documento/verifica"
              value={value.evidenceLink ?? ""}
              onChange={(e) => set("evidenceLink", e.target.value)}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-end">
        <Button onClick={() => onSubmit()} disabled={!!submitting}>
          {submitting ? "Salvataggio…" : "Salva e firma VC"}
        </Button>
      </CardFooter>
    </Card>
  );
}
