// src/pages/auth/LoginPage.tsx
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import LoginForm from "@/components/auth/LoginForm";
import BlockchainBackgroundDeep from "@/components/layout/BlockchainBackgroundDeep";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen grid place-items-center p-6 overflow-hidden">
      <BlockchainBackgroundDeep palette="cyan" />

      <Card className="relative z-10 w-full max-w-xl bg-background/80 supports-[backdrop-filter]:bg-background/60 backdrop-blur border border-white/10 shadow-xl">
        <CardHeader className="text-center space-y-3">
          <img
            src="/brand/TRUSTUP.png"
            alt="TRUSTUP"
            className="h-12 md:h-14 mx-auto select-none pointer-events-none invert"
            draggable={false}
          />
        </CardHeader>

        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
