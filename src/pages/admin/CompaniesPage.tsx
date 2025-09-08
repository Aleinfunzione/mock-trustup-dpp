import React, { useMemo, useState } from "react";
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

export default function CompaniesPage() {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(""); const [lastCreated, setLastCreated] = useState<Actor | null>(null);
  const [filter, setFilter] = useState("");

  const companies = useMemo(() => loadRegistry().filter((a) => a.role === "company"), []);
  const filtered = companies.filter((c) => [c.name, c.did].some((v) => v.toLowerCase().includes(filter.toLowerCase())));

  if (!user) return <div className="p-6">Devi essere autenticato.</div>;
  if (user.role !== "admin") return <div className="p-6">Accesso negato (solo Admin).</div>;

  function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim()) return;
    const seed = randomSeed(40); const { did, publicKeyBase64 } = makeKeysFromSeed(seed);
    const newCompany: Actor = { did, role: "company", name: name.trim(), publicKeyBase64, seed };
    const reg = loadRegistry();
    if (reg.some((r) => r.did === did)) { alert("Conflitto DID generato: riprova."); return; }
    reg.push(newCompany); saveRegistry(reg); setLastCreated(newCompany); setName("");
  }

  function copyToClipboard(text: string) { navigator.clipboard.writeText(text); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Aziende</h1>
        <Badge variant="secondary">Admin only</Badge>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Nuova Azienda</h2>
          <form onSubmit={handleCreateCompany} className="grid gap-4 md:grid-cols-3 items-end">
            <div className="md:col-span-2">
              <Label htmlFor="name">Ragione sociale</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme S.p.A." />
            </div>
            <Button type="submit" className="w-full md:w-auto">Crea</Button>
          </form>

          {lastCreated && (
            <div className="mt-4 grid gap-3">
              <p className="text-sm text-muted-foreground">Credenziali generate (mostrale una volta al referente):</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border">
                  <div className="text-xs uppercase text-muted-foreground">Company DID</div>
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
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Elenco aziende</h2>
            <Input placeholder="Filtra per nome o DID" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
          </div>
          <div className="grid gap-3">
            {filtered.length === 0 && (<div className="text-sm text-muted-foreground">Nessuna azienda trovata.</div>)}
            {filtered.map((c) => (
              <div key={c.did} className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground font-mono break-all">{c.did}</div>
                </div>
                <div className="flex gap-2">
                  <Badge>{c.role}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(c.seed)}>
                    <Copy className="h-4 w-4 mr-1"/> Copia seed
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
