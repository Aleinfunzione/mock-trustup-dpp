// src/pages/admin/AdminCreditsPage.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import CompanyCreditsSection from "@/components/company/CompanyCreditsSection";

export default function AdminCreditsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestione crediti</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Riusa la sezione: mostra top-up/transfer/soglie/storico */}
          <CompanyCreditsSection />
        </CardContent>
      </Card>
    </div>
  );
}
