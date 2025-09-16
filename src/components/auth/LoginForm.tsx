import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import SeedPhraseInput from "@/components/auth/SeedPhraseInput"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/utils/constants"

type Mode = "seed" | "admin"

export default function LoginForm() {
  const { loginSeed, loginAdmin } = useAuth()
  const [mode, setMode] = useState<Mode>("seed")

  // seed
  const [seed, setSeed] = useState("")
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedError, setSeedError] = useState("")

  // admin
  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("admin")
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState("")

  async function handleSeedLogin() {
    try {
      setSeedLoading(true)
      setSeedError("")
      const user = await loginSeed(seed)
      const map: Record<string, string> = {
        admin: ROUTES.admin,
        company: ROUTES.company,
        creator: ROUTES.creator,
        operator: ROUTES.operator,
        machine: ROUTES.machine,
      }
      window.location.href = map[user.role] ?? ROUTES.creator
    } catch (e: any) {
      setSeedError(e?.message ?? "Errore di login")
    } finally {
      setSeedLoading(false)
    }
  }

  async function handleAdminLogin() {
    try {
      setAdminLoading(true)
      setAdminError("")
      await loginAdmin(username, password)
      window.location.href = ROUTES.admin
    } catch (e: any) {
      setAdminError(e?.message ?? "Credenziali non valide")
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        <Button
          variant={mode === "seed" ? "default" : "outline"}
          onClick={() => setMode("seed")}
        >
          Seed Login
        </Button>
        <Button
          variant={mode === "admin" ? "default" : "outline"}
          onClick={() => setMode("admin")}
        >
          Admin Login
        </Button>
      </div>

      {mode === "seed" ? (
        <Card>
          <CardHeader>
            <CardTitle>Login con Seed</CardTitle>
            <CardDescription>Derivazione DID (mock) e lookup ruolo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SeedPhraseInput value={seed} onChange={setSeed} error={seedError} />
            <Button
              className="w-full"
              onClick={handleSeedLogin}
              disabled={seedLoading || !seed.trim()}
            >
              {seedLoading ? "Accesso…" : "Continua"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>Accesso con username/password (mock)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
            {adminError && <p className="text-sm text-red-500">{adminError}</p>}
            <Button
              className="w-full"
              onClick={handleAdminLogin}
              disabled={adminLoading || !username || !password}
            >
              {adminLoading ? "Accesso…" : "Entra nell'area Admin"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
