import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import ProductList from "@/components/products/productList";
import ProductForm from "@/components/products/ProductForm";
import { useAuthStore } from "@/stores/authStore";
// opzionale: se vuoi fallback per companyDid da rubrica attori, abilita la riga sotto
// import { getActor } from "@/services/api/identity";

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const [openForm, setOpenForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { currentUser } = useAuthStore();

  // Dati profilo con fallback sicuri
  const profile = useMemo(() => {
    const firstName =
      (currentUser as any)?.firstName ??
      (currentUser as any)?.profile?.firstName ??
      "—";
    const lastName =
      (currentUser as any)?.lastName ??
      (currentUser as any)?.profile?.lastName ??
      "—";
    const did = (currentUser as any)?.did ?? "—";
    // const actor = did ? getActor(did) : undefined; // se abiliti getActor
    const companyDid =
      (currentUser as any)?.companyDid /* ?? actor?.companyDid */ ?? "—";
    const role = (currentUser as any)?.role ?? "creator";
    return { firstName, lastName, did, companyDid, role };
  }, [currentUser]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard Creator</h1>
        <p className="text-muted-foreground">
          Gestisci i prodotti, la distinta base (BOM) e pubblica i DPP (MOCK).
        </p>
      </div>

      {/* Profilo operatore/creator */}
      <Card>
        <CardHeader>
          <CardTitle>Profilo operatore</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Nome e cognome:</span>{" "}
            <span className="font-medium">
              {profile.firstName} {profile.lastName}
            </span>
          </div>
          <div className="font-mono text-xs">
            <span className="text-muted-foreground">DID:</span>{" "}
            <span>{profile.did}</span>
          </div>
          <div className="font-mono text-xs">
            <span className="text-muted-foreground">Azienda:</span>{" "}
            <span>{profile.companyDid}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Ruolo: <span className="uppercase">{String(profile.role)}</span>
          </div>

          {/* Placeholder per VC/certificazioni future */}
          <div className="mt-3 rounded-md border p-3">
            <div className="text-sm font-medium">Verifiable Credentials</div>
            <p className="text-xs text-muted-foreground">
              Nessuna VC associata. In futuro qui potrai vedere certificazioni,
              attestati e idoneità operative del creator/operatore/macchinario.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form creazione prodotto (toggle) */}
      {openForm && (
        <ProductForm
          onCreated={() => {
            setRefreshKey((k) => k + 1); // forza refresh lista
            setOpenForm(false);
          }}
          onCancel={() => setOpenForm(false)}
        />
      )}

      {/* Lista prodotti con azioni */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>I miei prodotti</CardTitle>
          <Button onClick={() => setOpenForm(true)}>Nuovo prodotto</Button>
        </CardHeader>
        <CardContent>
          <ProductList
            key={refreshKey}
            onCreateNew={() => setOpenForm(true)}
            onOpenProduct={(id: string) => navigate(`/creator/products/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
