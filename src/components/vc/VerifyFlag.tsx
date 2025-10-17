// src/components/vc/VerifyFlag.tsx
import * as React from "react";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";

export default function VerifyFlag({ valid }: { valid?: boolean | null }) {
  if (valid === true) {
    return (
      <span title="Integrità valida" aria-label="valid">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      </span>
    );
  }
  if (valid === false) {
    return (
      <span title="Integrità NON valida" aria-label="invalid">
        <XCircle className="h-4 w-4 text-red-600" />
      </span>
    );
  }
  return (
    <span title="Integrità sconosciuta" aria-label="unknown">
      <HelpCircle className="h-4 w-4 text-muted-foreground" />
    </span>
  );
}
