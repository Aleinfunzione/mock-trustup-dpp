import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import LoginForm from "@/components/auth/LoginForm"

export default function LoginPage() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>TRUSTUP</CardTitle>
          <CardDescription>Seleziona il tipo di login: Seed o Admin</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
