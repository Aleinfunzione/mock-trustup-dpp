// src/pages/creator/CreditsHistoryPage.tsx
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import CreditHistory from "@/components/credit/CreditHistory";

export default function CreatorCreditsHistoryPage() {
  const { currentUser } = useAuthStore();
  const { search, pathname } = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!currentUser?.did) return;
    const p = new URLSearchParams(search);
    if (!p.get("actor")) {
      p.set("actor", currentUser.did);
      navigate(`${pathname}?${p.toString()}`, { replace: true });
    }
  }, [currentUser?.did, search, pathname, navigate]);

  return (
    <Card>
      <CardHeader><CardTitle>Storico crediti • Creator</CardTitle></CardHeader>
      <CardContent><CreditHistory /></CardContent>
    </Card>
  );
}
