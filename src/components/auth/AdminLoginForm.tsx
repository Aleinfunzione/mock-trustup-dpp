import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";

const REGISTRY_KEY = "identity_registry";
const ADMIN_CREDS_KEY = "admin_credentials"; // { username, password, adminDid }

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
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as Actor[]) : [];
  } catch {
    return [];
  }
}
function saveRegistry(list: Actor[]) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(list));
}
function randomSeed(len = 32) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => alphabet[n % alphabet.length]).join("");
}
function makeKeysFromSeed(seed: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  let hash = 0;
  for (let i = 0; i < data.length; i++) hash = (hash * 31 + data[i]) >>> 0;
  const pub = btoa(String(hash));
  const did = `did:mock:${pub}`;
  return { did, publicKeyBase64: pub };
}

export default function AdminLoginForm() {
  const { loginAdmin } = useAuthStore();

  const creds = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(ADMIN_CREDS_KEY) || "null");
    } catch {
      return null;
    }
  }, []);

  // LOGIN esistente
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // BOOTSTRAP iniziale
  const [adminName, setAdminName] = useState("Admin");
  const [newUsername, setNewUsername] = useState("admin@local");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bootstrapResult, setBootstrapResult] = useState<Actor | null>(null);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ok = loginAdmin(username.trim(), password);
    if (!ok) setError("Credenziali non valide.");
  }

  function handleBootstrap(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newUsername.trim() || !newPassword || newPassword !== confirmPassword) {
      setError("Compila i campi e verifica la conferma password.");
      return;
    }
    const seed = randomSeed(40);
    const { did, publicKeyBase64 } = makeKeysFromSeed(seed);

    const reg = loadRegistry();
    if (reg.some((r) => r.did === did)) {
      setError("Conflitto DID generato: riprova.");
      return;
    }
    const adminActor: Actor = {
      did,
      role: "admin",
      name: adminName.trim() || "Admin",
      publicKeyBase64,
      seed,
    };
    reg.push(adminActor);
    saveRegistry(reg);

    localStorage.setItem(
      ADMIN_CREDS_KEY,
      JSON.stringify({ username: newUsername.trim(), password: newPassword, adminDid: did })
    );

    setBootstrapResult(adminActor);
  }

  // NESSUN ADMIN → wizard creazione
  if (!creds) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Crea Admin</h2>
            <Badge variant="secondary">Setup iniziale</Badge>
          </div>

          <form onSubmit={handleBootstrap} className="grid gap-4">
            <div>
              <Label htmlFor="adminName">Nome</Label>
              <Input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="newUsername">Username (email)</Label>
              <Input id="newUsername" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="admin@local" />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="newPassword">Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Conferma password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button type="submit">Crea Admin</Button>
          </form>

          {bootstrapResult && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">Admin creato. Conserva questi dati (mostrati una sola volta):</p>
              <div className="p-3 rounded-xl border">
                <div className="text-xs uppercase text-muted-foreground">Admin DID</div>
                <div className="font-mono break-all">{bootstrapResult.did}</div>
              </div>
              <div className="p-3 rounded-xl border">
                <div className="text-xs uppercase text-muted-foreground">Seed (locale)</div>
                <div className="font-mono break-all">{bootstrapResult.seed}</div>
              </div>
              <div className="p-3 rounded-xl border">
                <div className="text-xs uppercase text-muted-foreground">Username</div>
                <div className="font-mono break-all">{newUsername}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ADMIN ESISTE → form login
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Accesso Admin</h2>
        <form onSubmit={handleLogin} className="grid gap-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={creds.username || "email"} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          <Button type="submit">Entra</Button>
        </form>
      </CardContent>
    </Card>
  );
}
