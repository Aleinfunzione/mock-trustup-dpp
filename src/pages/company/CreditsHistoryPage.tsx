// src/pages/company/CreditsHistoryPage.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import CreditHistory from "@/components/credit/CreditHistory";

export default function CreditsHistoryPage() {
  return (
    <Card>
      <CardHeader><CardTitle>Storico crediti</CardTitle></CardHeader>
      <CardContent><CreditHistory /></CardContent>
    </Card>
  );
}
