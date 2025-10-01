// src/components/company/CompanyCreditsSection.tsx
import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import CreditsPanel from "@/components/credit/CreditsPanel";
import { initCredits } from "@/services/api/credits";
import type { AccountOwnerType } from "@/types/credit";

export default function CompanyCreditsSection() {
  const { currentUser } = useAuth();
  const u = currentUser as any;
  const companyId = (u?.companyId ?? u?.companyDid) as string | undefined;

  React.useEffect(() => {
    if (!companyId) return;
    // Idempotente: crea se mancano
    initCredits({
      adminId: "root",
      companyIds: [companyId],
      members: [], // puoi popolare con operator/machine se vuoi conti dedicati
      defaults: { balance: 0, threshold: 5 },
    });
  }, [companyId]);

  if (!companyId) return null;

  const actor = {
    ownerType: "company" as AccountOwnerType,
    ownerId: companyId,
    companyId,
  };

  return <CreditsPanel actor={actor} allowTopupFromAdmin />;
}
