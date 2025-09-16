import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Company } from "@/types/identity"
import {
  createCompanyWithAccount,
  listCompanies,
  listCompanyAccountsWithSeeds,
  deleteCompany,
} from "@/services/api/identity"

export default function AdminCompaniesPanel() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [accounts, setAccounts] = useState<Array<{ did: string; companyDid?: string; username?: string; seed?: string }>>([])

  // form dati azienda
  const [name, setName] = useState("")
  const [vat, setVat] = useState("")
  const [address, setAddress] = useState("")
  const [website, setWebsite] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ultimo creato (per evidenza)
  const [lastSeed, setLastSeed] = useState<string | null>(null)
  const [lastDid, setLastDid] = useState<string | null>(null)
  const [lastCompanyDid, setLastCompanyDid] = useState<string | null>(null)

  function refresh() {
    setCompanies(listCompanies())
    setAccounts(listCompanyAccountsWithSeeds())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleCreate() {
    try {
      setLoading(true)
      setError(null)
      setLastSeed(null)
      setLastDid(null)
      setLastCompanyDid(null)

      if (!name.trim()) throw new Error("Inserisci il nome azienda")
      const input = {
        name: name.trim(),
        details: {
          vatNumber: vat.trim() || undefined,
          address: address.trim() || undefined,
          website: website.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        },
      }
      const res = await createCompanyWithAccount(input)

      setName(""); setVat(""); setAddress(""); setWebsite(""); setEmail(""); setPhone("")
      refresh()

      setLastSeed(res.seed)
      setLastDid(res.account.did)
      setLastCompanyDid(res.company.companyDid)
    } catch (e: any) {
      setError(e?.message ?? "Errore nella creazione azienda")
    } finally {
      setLoading(false)
    }
  }

  function handleDelete(companyDid: string) {
    const ok = window.confirm("Eliminare l'azienda? (MOCK: rimuove anche account e membri)")
    if (!ok) return
    deleteCompany(companyDid, { cascade: true })
    refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aziende</CardTitle>
        <CardDescription>
          Crea/Elimina aziende (MOCK) e gestisci account <em>Company</em>. Le mnemoniche sono visibili solo in questa demo.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* FORM */}
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome azienda</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Prova S.p.A." />
            </div>
            <div className="space-y-2">
              <Label>P.IVA</Label>
              <Input value={vat} onChange={(e) => setVat(e.target.value)} placeholder="IT12345678901" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Indirizzo</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Via Esempio 1, 20100 Milano (MI)" />
            </div>
            <div className="space-y-2">
              <Label>Sito</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Telefono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 02 123456" />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex">
            <Button onClick={handleCreate} disabled={loading || !name.trim()}>
              {loading ? "Creazione…" : "Crea azienda"}
            </Button>
          </div>
        </div>

        {/* RISULTATO ULTIMA CREAZIONE */}
        {lastSeed && lastDid && lastCompanyDid && (
          <div className="rounded-md border p-4 bg-muted/40 space-y-1">
            <div className="text-sm">
              <span className="font-medium">Azienda DID:</span>{" "}
              <span className="font-mono">{lastCompanyDid}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium">Account Company DID:</span>{" "}
              <span className="font-mono">{lastDid}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium">Mnemonic (12 parole):</span>
              <div className="mt-1 font-mono text-xs break-words">{lastSeed}</div>
            </div>
          </div>
        )}

        {/* ELENCO AZIENDE */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Elenco aziende ({companies.length})</h3>
          <div className="divide-y rounded-md border">
            {companies.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Nessuna azienda registrata.</div>
            ) : (
              companies.map((c) => (
                <div key={c.companyDid} className="p-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{c.name}</div>
                    <Button variant="destructive" onClick={() => handleDelete(c.companyDid)}>Elimina</Button>
                  </div>
                  <div className="text-muted-foreground">DID: <span className="font-mono">{c.companyDid}</span></div>
                  {c.details?.vatNumber && <div className="text-muted-foreground">P.IVA: {c.details.vatNumber}</div>}
                  {c.details?.address && <div className="text-muted-foreground">Indirizzo: {c.details.address}</div>}
                  {c.details?.website && <div className="text-muted-foreground">Sito: {c.details.website}</div>}
                  {c.details?.email && <div className="text-muted-foreground">Email: {c.details.email}</div>}
                  {c.details?.phone && <div className="text-muted-foreground">Tel: {c.details.phone}</div>}
                  <div className="text-muted-foreground">Creato: {new Date(c.createdAt).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SEED COMPANY (MOCK) */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Account Company & mnemoniche (MOCK)</h3>
          <div className="divide-y rounded-md border">
            {accounts.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Nessun account Company.</div>
            ) : (
              accounts.map((a) => (
                <div key={a.did} className="p-4 text-sm space-y-1">
                  <div>
                    DID account: <span className="font-mono">{a.did}</span>
                    {a.companyDid && (
                      <span className="ml-2 text-muted-foreground">
                        (companyDid: <span className="font-mono">{a.companyDid}</span>)
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground">Username: {a.username ?? "—"}</div>
                  <div className="text-muted-foreground">
                    Mnemonic: {a.seed ? <span className="font-mono break-words">{a.seed}</span> : <em>non disponibile</em>}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex">
            <Button variant="outline" onClick={refresh}>Ricarica</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
