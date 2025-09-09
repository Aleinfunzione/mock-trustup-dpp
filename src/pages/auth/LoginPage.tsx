import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import LoginForm from "@/components/auth/LoginForm";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const hasAdminSeed = Boolean(import.meta.env.VITE_ADMIN_SEED?.trim());

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] p-4">
      <Card className="w-full max-w-xl border-zinc-800 bg-[#0F1526] text-zinc-100 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <CardTitle className="text-2xl tracking-tight">TRUSTUP • Login</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            Inserisci la seed phrase per accedere. Se configurata, puoi usare la seed Admin.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <LoginForm />
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-2">
          {hasAdminSeed ? (
            <p className="text-sm text-zinc-400">
              L’accesso <span className="text-emerald-400">Admin</span> è attivo: usa il pulsante dedicato nella form.
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              Variabile <code className="text-zinc-300">VITE_ADMIN_SEED</code> non configurata: il pulsante Admin non sarà mostrato.
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
