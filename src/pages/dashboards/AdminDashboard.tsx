import AdminCompaniesPanel from "@/components/admin/AdminCompaniesPanel"

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard Admin</h1>
        <p className="text-muted-foreground">
          Gestisci aziende, utenti e crediti (MOCK, localStorage).
        </p>
      </div>

      <AdminCompaniesPanel />
    </div>
  )
}
