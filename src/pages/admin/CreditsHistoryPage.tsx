// src/pages/admin/CreditsHistoryPage.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import CreditHistory from "@/components/credit/CreditHistory";

export default function AdminCreditsHistoryPage() {
  return (
    <Card>
      <CardHeader><CardTitle>Storico crediti • Admin</CardTitle></CardHeader>
      <CardContent><CreditHistory /></CardContent>
    </Card>
  );
}
