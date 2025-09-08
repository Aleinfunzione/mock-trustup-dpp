import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const REGISTRY_KEY = "identity_registry";

type Role = "admin" | "company" | "creator" | "operator" | "machine";

type Actor = {
  did: string;
  role: Role;
  name: string;
  publicKeyBase64: string;
  companyDid?: string;
  seed: string;
};

function loadRegistry(): Actor[] {
  try { const raw = localStorage.getItem(REGISTRY_KEY); return raw ? (JSON.parse(raw) as Actor[]) : []; } catch { return []; }
}
function saveRegistry(list: Actor[]) { localStorage.setItem(REGISTRY_KEY, JSON.stringify(list)); }

function randomSeed(len = 32) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const arr = new Uint8Array(len); crypto.getRandomValues(arr);
  return Array.from(arr, (n) => alphabet[n % alphabet.length]).join("");
}
function makeKeysFromSeed(seed: string) {
  const encoder = new TextEncoder(); const data = encoder.encode(seed);
  let hash = 0; for (let i = 0; i < data.length; i++) hash = (hash * 31 + data[i]) >>> 0;
  const pub = btoa(String(hash)); const did = `did:mock:${pub}`; return { did, publicKeyBase64: pub };
}

export default function TeamPage() {
  const user = useAuthStore((s) => s.user);

  const [selectedCompanyDid, setSelectedCompanyDid] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("creator");
  const [lastCreated, setLastCreated] = useState<Actor | null>(null);

  const companies = useMemo(() => loadRegistry().filter((a) => a.role === "company"), []);
  const members = useMemo(() => loadRegistry().filter((a) => a.companyDid), []);
  const team = members.filter((m) => m.companyDid === (user?.role === "company" ? (user.companyDid ?? user.did) : selectedCompanyDid));

  useEffect(() => {
    if (user?.role === "company") setSelectedCompanyDid(user.companyDid ?? user.did);
  }, [user]);

  if (!user) return <div className="p-6">Devi essere autenticato.</div>;
  if (!["company", "admin"].includes(user.role)) return <div className="p-6">Accesso negato (Company o Admin).</div>;

  function handleCreateMember(e: React.FormEvent) {
    e.preventDefault();
    const companyDid = user.role === "company" ? (user.companyDid ?? user.did) : selectedCompanyDid;
    if (!companyDid) { alert("Seleziona un'azienda."); return; }
    if (!name.trim()) return;

    const seed = randomSeed(40);
    const { did, publicKeyBase64 } = makeKeysFromSeed(seed);
    const newMember: Actor = { did, role, name: name.trim(), publicKeyBase64, seed, companyDid };

    const reg = loadRegistry();
    if (reg.some((r) => r.did === did)) { alert("Conflitto DID generato: riprova."); return; }
    reg.push(newMember); saveRegistry(reg); setLastCreated(newMember); setName("");
  }

  function copyToClipboard(text: string) { navigator.clipboard.writeText(text); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team</h1>
        <Badge variant="secondary">Company / Admin</Badge>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Nuovo attore interno</h2>
          <form onSubmit={handleCreateMember} className="grid gap-4 md:grid-cols-4 items-end">
            {user.role === "admin" ? (
              <div className="md:col-span-2">
                <Label htmlFor="company">Azienda</Label>
                <select id="company" className="mt-1 w-full rounded-xl border p-2 bg-background"
                        value={selectedCompanyDid} onChange={(e) => setSelectedCompanyDid(e.target.value)}>
                  <option value="">— seleziona —</option>
                  {companies.map((c) => (<option key={c.did} value={c.did}>{c.name}</option>))}
                </select>
              </div>
            ) : (
              <div className="md:col-span-2">
                <Label>Azienda</Label>
                <div className="mt-1 p-2 rounded-xl border font-mono text-sm break-all">{user.companyDid ?? user.did}</div>
              </div>
            )}
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mario Rossi" />
            </div>
            <div>
              <Label htmlFor="role">Ruolo</Label>
              <select id="role" className="mt-1 w-full rounded-xl border p-2 bg-background"
                      value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="creator">Creator</option>
                <option value="operator">Operator</option>
                <option value="machine">Machine</option>
              </select>
            </div>
            <div className="md:col-span-4"><Button type="submit">Crea</Button></div>
          </form>

          {lastCreated && (
            <div className="mt-4 grid gap-3">
              <p className="text-sm text-muted-foreground">Credenziali generate (consegnale al membro):</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border">
                  <div className="text-xs uppercase text-muted-foreground">Member DID</div>
                  <div className="font-mono break-all mt-1">{lastCreated.did}</div>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => copyToClipboard(lastCreated.did)}>
                    <Copy className="h-4 w-4 mr-1"/> Copia DID
                  </Button>
                </div>
                <div className="p-3 rounded-xl border">
                  <div className="text-xs uppercase text-muted-foreground">Seed (locale)</div>
                  <div className="font-mono break-all mt-1">{lastCreated.seed}</div>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => copyToClipboard(lastCreated.seed)}>
                    <Copy className="h-4 w-4 mr-1"/> Copia Seed
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Membri aziendali</h2>
          {(user.role === "company" ? (user.companyDid ?? user.did) : selectedCompanyDid) ? (
            <div className="grid gap-3">
              {team.length === 0 && (<div className="text-sm text-muted-foreground">Nessun membro per questa azienda.</div>)}
              {team.map((m) => (
                <div key={m.did} className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground font-mono break-all">{m.did}</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{m.role}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(m.seed)}>
                      <Copy className="h-4 w-4 mr-1"/> Copia seed
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Seleziona un'azienda per vedere i membri.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
