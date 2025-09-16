import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import type { IdentityRecord } from "@/types/identity"
import type { Role } from "@/types/auth"
import {
  getRegistry,
  listCompanyMembers,
  linkUserToCompany,
  setActorRole,
  createInternalActor,
  getActor,
} from "@/services/api/identity"

const COMPANY_ROLES: Role[] = ["creator", "operator", "machine"]

export default function CompanyMembersPanel() {
  const { currentUser } = useAuth()

  // Fallback robusto su registro, come in CompanyDashboard
  const actor = currentUser?.did ? getActor(currentUser.did) : undefined
  const companyDid = currentUser?.companyDid ?? actor?.companyDid

  const [members, setMembers] = useState<IdentityRecord[]>([])
  const [search, setSearch] = useState("")
  const [savingDid, setSavingDid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [inviteDid, setInviteDid] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("creator")

  const [newUsername, setNewUsername] = useState("")
  const [newRole, setNewRole] = useState<Role>("creator")
  const [lastCreated, setLastCreated] = useState<{ did: string; seed: string } | null>(null)

  function refreshMembers() {
    if (!companyDid) {
      setMembers([])
      return
    }
    setMembers(listCompanyMembers(companyDid))
  }

  useEffect(() => {
    refreshMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyDid])

  const filtered = useMemo(() => {
    let list = members
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.did.toLowerCase().includes(q) ||
          (a.username ?? "").toLowerCase().includes(q) ||
          (a.role ?? "").toLowerCase().includes(q)
      )
    }
    return list
  }, [members, search])

  async function handleInvite() {
    try {
      setSavingDid(inviteDid)
      setError(null)
      if (!companyDid) throw new Error("Questo account non è associato ad alcuna azienda.")
      if (!inviteDid.trim()) throw new Error("Inserisci un DID valido")
      await Promise.resolve(linkUserToCompany(inviteDid.trim(), companyDid))
      if (COMPANY_ROLES.includes(inviteRole)) {
        await Promise.resolve(setActorRole(inviteDid.trim(), inviteRole))
      }
      setInviteDid("")
      setInviteRole("creator")
      refreshMembers()
    } catch (e: any) {
      setError(e?.message ?? "Errore nell'aggiunta del membro")
    } finally {
      setSavingDid(null)
    }
  }

  async function handleCreate() {
    try {
      setSavingDid("__create__")
      setError(null)
      if (!companyDid) throw new Error("Questo account non è associato ad alcuna azienda.")
      if (!COMPANY_ROLES.includes(newRole)) throw new Error("Ruolo non consentito")

      const { record, seed } = await createInternalActor(companyDid, newRole, newUsername || undefined)
      setLastCreated({ did: record.did, seed })
      setNewUsername("")
      setNewRole("creator")
      refreshMembers()
    } catch (e: any) {
      setError(e?.message ?? "Errore nella creazione del membro")
    } finally {
      setSavingDid(null)
    }
  }

  async function handleSaveRole(did: string, newRoleValue: Role) {
    try {
      setSavingDid(did)
      setError(null)
      if (!COMPANY_ROLES.includes(newRoleValue)) throw new Error("Ruolo non consentito")
      await Promise.resolve(setActorRole(did, newRoleValue))
      refreshMembers()
    } catch (e: any) {
      setError(e?.message ?? "Errore nel salvataggio")
    } finally {
      setSavingDid(null)
    }
  }

  async function handleUnlink(did: string) {
    try {
      setSavingDid(did)
      setError(null)
      const reg = getRegistry()
      const actor = reg.actors[did]
      if (!actor) throw new Error("Utente inesistente")
      reg.actors[did] = { ...actor, companyDid: undefined }
      localStorage.setItem("trustup.identityRegistry", JSON.stringify(reg))
      refreshMembers()
    } catch (e: any) {
      setError(e?.message ?? "Errore nello scollegamento")
    } finally {
      setSavingDid(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team aziendale</CardTitle>
        <CardDescription>Gestisci Creator / Operator / Machine della tua azienda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!companyDid ? (
          <p className="text-sm text-red-500">
            Questo account non è associato ad alcuna azienda. Contatta l’amministratore.
          </p>
        ) : (
          <>
            {/* CREA nuovo membro */}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <div className="space-y-2">
                <Label>Nome (opzionale)</Label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="es. mario.rossi"
                />
              </div>
              <div className="space-y-2">
                <Label>Ruolo</Label>
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                >
                  {COMPANY_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={handleCreate} disabled={!!savingDid}>
                  {savingDid === "__create__" ? "Creazione…" : "Crea nuovo membro"}
                </Button>
              </div>
            </div>

            {/* Mostra seed generata per l'ultimo membro creato */}
            {lastCreated && (
              <div className="rounded-md border p-4 bg-muted/40 space-y-1">
                <div className="text-sm">
                  <span className="font-medium">Nuovo membro:</span>{" "}
                  <span className="font-mono">{lastCreated.did}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Seed (conservala e consegnala al membro):</span>
                  <div className="mt-1 font-mono text-xs break-all">{lastCreated.seed}</div>
                </div>
              </div>
            )}

            {/* INVITA utente esistente */}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="invite-did">DID utente esistente</Label>
                <Input
                  id="invite-did"
                  value={inviteDid}
                  onChange={(e) => setInviteDid(e.target.value)}
                  placeholder="did:mock:..."
                />
              </div>
              <div className="space-y-2">
                <Label>Ruolo</Label>
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                >
                  {COMPANY_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={handleInvite} disabled={!inviteDid.trim() || !!savingDid}>
                  {savingDid === inviteDid ? "Aggiunta…" : "Aggiungi membro esistente"}
                </Button>
              </div>
            </div>

            {/* Filtri elenco */}
            <div className="space-y-2">
              <Label>Cerca</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="DID, username o ruolo…"
              />
            </div>

            {/* Lista membri */}
            <div className="rounded-md border divide-y">
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Nessun membro associato. Crea un nuovo membro o invita un DID esistente.
                </div>
              ) : (
                filtered.map((m) => (
                  <MemberRow
                    key={m.did}
                    actor={m}
                    onSaveRole={handleSaveRole}
                    onUnlink={handleUnlink}
                    saving={savingDid === m.did}
                  />
                ))
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MemberRow({
  actor,
  onSaveRole,
  onUnlink,
  saving,
}: {
  actor: IdentityRecord
  onSaveRole: (did: string, newRole: Role) => void
  onUnlink: (did: string) => void
  saving: boolean
}) {
  const [role, setRole] = useState<Role>(actor.role)

  return (
    <div className="p-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div className="space-y-1">
        <div className="font-medium">
          {actor.username ? `${actor.username} ` : ""}
          <span className="text-muted-foreground font-normal block sm:inline sm:ml-1">
            <span className="font-mono">{actor.did}</span>
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Ruolo attuale: <span className="font-medium">{actor.role}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {COMPANY_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => onUnlink(actor.did)} disabled={saving}>
          Scollega
        </Button>
        <Button onClick={() => onSaveRole(actor.did, role)} disabled={saving}>
          {saving ? "Salvataggio…" : "Salva"}
        </Button>
      </div>
    </div>
  )
}
