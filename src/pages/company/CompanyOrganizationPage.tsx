// src/pages/company/CompanyOrganizationPage.tsx
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CompanyTeamPage from "@/pages/company/CompanyTeamPage";
import CompanyIslandsPage from "@/pages/company/CompanyIslandsPage";

export default function CompanyOrganizationPage() {
  const [sp, setSp] = useSearchParams();
  const showIslands = import.meta.env.VITE_FEATURE_ISLANDS !== "false";
  const initial = sp.get("tab");
  const tab = initial === "islands" && showIslands ? "islands" : "team";

  function onTabChange(v: string) {
    sp.set("tab", v);
    setSp(sp, { replace: true });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organizzazione</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList>
            <TabsTrigger value="team">Team</TabsTrigger>
            {showIslands && <TabsTrigger value="islands">Isole</TabsTrigger>}
          </TabsList>

          <TabsContent value="team">
            <CompanyTeamPage />
          </TabsContent>

          {showIslands && (
            <TabsContent value="islands">
              <CompanyIslandsPage />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
