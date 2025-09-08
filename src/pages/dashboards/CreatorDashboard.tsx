import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function CreatorDashboard() {
  return (
    <div className="p-6 grid gap-4 md:grid-cols-2">
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold">Benvenuto in Creator</h2>
          <p className="text-sm text-muted-foreground mt-2">Dashboard placeholder per allineare la UI.</p>
        </CardContent>
      </Card>
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-medium">Prossimi step</h3>
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>Moduli Crediti</li>
            <li>Prodotti & BOM</li>
            <li>DPP-VC (crea/verifica)</li>
            <li>Eventi & Tracciabilità</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
