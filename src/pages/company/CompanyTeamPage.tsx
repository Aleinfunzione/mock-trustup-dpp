import CompanyMembersPanel from "@/components/company/CompanyMembersPanel"

export default function CompanyTeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-muted-foreground">
          Crea o invita Creator / Operator / Machine della tua azienda.
        </p>
      </div>
      <CompanyMembersPanel />
    </div>
  )
}
