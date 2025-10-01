// src/pages/dashboards/CompanyDashboard.tsx
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getCompany,
  listCompanyMembers,
  listCompanyMemberSeeds,
  getActor,
} from "@/services/api/identity";
import CompanyCreditsSection from "@/components/company/CompanyCreditsSection";

export default function CompanyDashboard() {
  const { currentUser } = useAuth();

  // Fallback robusto
  const actor = currentUser?.did ? getActor(currentUser.did) : undefined;
  const companyDid = currentUser?.companyDid ?? actor?.companyDid;
  const company = companyDid ? getCompany(companyDid) : undefined;

  const members = useMemo(
    () => (companyDid ? listCompanyMembers(companyDid) : []),
    [companyDid]
  );
  const seeds = useMemo(
    () => (companyDid ? listCompanyMemberSeeds(companyDid) : []),
    [companyDid]
  );

  const counts = useMemo(() => {
    const c = { creator: 0, operator: 0, machine: 0 };
    for (const m of members) {
      if (m.role === "creator") c.creator++;
      if (m.role === "operator") c.operator++;
      if (m.role === "machine") c.machine++;
    }
    return c;
  }, [members]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Home azienda</h1>
        {!companyDid ? (
          <p className="text-red-500">Questo account non è associato ad alcuna azienda.</p>
        ) : (
          <div className="mt-2 text-sm space-y-1">
            <div className="text-muted-foreground">
              Account: <span className="font-mono">{currentUser?.did}</span>
            </div>
            <div className="text-muted-foreground">
              Azienda DID: <span className="font-mono">{companyDid}</span>
            </div>
            <div className="text-muted-foreground">Nome: {company?.name ?? "—"}</div>
            {company?.details?.vatNumber && (
              <div className="text-muted-foreground">P.IVA: {company.details.vatNumber}</div>
            )}
            {company?.details?.address && (
              <div className="text-muted-foreground">Indirizzo: {company.details.address}</div>
            )}
            {company?.details?.website && (
              <div className="text-muted-foreground">Sito: {company.details.website}</div>
            )}
            {company?.details?.email && (
              <div className="text-muted-foreground">Email: {company.details.email}</div>
            )}
            {company?.details?.phone && (
              <div className="text-muted-foreground">Tel: {company.details.phone}</div>
            )}
          </div>
        )}
      </div>

      {companyDid && (
        <>
          {/* Sezione crediti */}
          <section className="rounded-md border p-4">
            <h2 className="font-semibold mb-2">Crediti</h2>
            <CompanyCreditsSection />
          </section>

          <section className="rounded-md border p-4">
            <h2 className="font-semibold">Riepilogo team</h2>
            <div className="mt-2 text-sm text-muted-foreground">
              Creator: {counts.creator} • Operatori: {counts.operator} • Macchine: {counts.machine}
            </div>
          </section>

          <section className="rounded-md border p-4">
            <h2 className="font-semibold">Seed membri (MOCK)</h2>
            <div className="mt-2 space-y-2 text-sm">
              {seeds.length === 0 ? (
                <div className="text-muted-foreground">Nessun membro creato.</div>
              ) : (
                seeds.map((s) => (
                  <div key={s.did} className="rounded border p-2">
                    <div>
                      <span className="font-medium">{s.username ?? s.role}</span> —{" "}
                      <span className="font-mono">{s.did}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Mnemonic: <span className="font-mono break-words">{s.seed ?? "—"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
