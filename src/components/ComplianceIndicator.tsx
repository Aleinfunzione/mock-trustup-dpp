// src/components/ComplianceIndicator.tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { StandardsRegistry, type StandardId } from "@/config/standardsRegistry";
import { useCredentialStore } from "@/stores/credentialStore";
import { evaluateCompliance } from "@/domains/compliance/services";

export default function ComplianceIndicator() {
  const navigate = useNavigate();
  const { org, load } = useCredentialStore();
  const [ok, setOk] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    load?.();
  }, [load]);

  React.useEffect(() => {
    let alive = true;
    async function run() {
      const orgRequired: StandardId[] = Object.values(StandardsRegistry)
        .filter((s) => s.scope === "organization")
        .map((s) => s.id as StandardId);

      const report = await evaluateCompliance(org || {}, {}, { organizationRequired: orgRequired });
      if (!alive) return;
      setOk(report.ok);
    }
    run();
    return () => {
      alive = false;
    };
  }, [org]);

  const clsOk = "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-600/30";
  const clsKo = "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30";

  return (
    <button
      type="button"
      onClick={() => navigate("/company/compliance")}
      title="Stato compliance organizzazione"
      className="inline-flex items-center"
    >
      <Badge className={ok === null ? "" : ok ? clsOk : clsKo}>
        {ok === null ? "Compliance…" : ok ? "Compliance Org: OK" : "Compliance Org: Azione"}
      </Badge>
    </button>
  );
}
