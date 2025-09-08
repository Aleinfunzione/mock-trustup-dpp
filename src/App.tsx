import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function App() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>TRUSTUP • MOCK</CardTitle>
          <CardDescription>UI base shadcn pronta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seed">Seed phrase</Label>
            <Input id="seed" placeholder="inserisci le 12/24 parole…" />
          </div>
          <Button className="w-full">Continua</Button>
        </CardContent>
      </Card>
    </div>
  );
}
