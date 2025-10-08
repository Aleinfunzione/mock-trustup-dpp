// src/pages/company/CompanyCreditsPage.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import CompanyCreditsSection from "@/components/company/CompanyCreditsSection";

export default function CompanyCreditsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crediti azienda</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyCreditsSection />
        </CardContent>
      </Card>
    </div>
  );
}
