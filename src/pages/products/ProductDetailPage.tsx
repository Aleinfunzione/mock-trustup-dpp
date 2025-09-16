import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import EventTimeline from "@/components/events/EventTimeline";
import EventForm from "@/components/events/EventForm";
import BOMEditor from "@/components/products/BOMEditor";
import { useProducts } from "@/hooks/useProducts";
import { useAuthStore } from "@/stores/authStore";
import type { BomNode } from "@/types/product";

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { listMine } = useProducts();
  const { currentUser } = useAuthStore();

  const products = React.useMemo(
    () => (typeof listMine === "function" ? listMine() : []),
    [listMine]
  );
  const product = React.useMemo(
    () => products.find((p: any) => p?.id === id),
    [products, id]
  );

  const [assigneeDid, setAssigneeDid] = React.useState("");
  const [timelineKey, setTimelineKey] = React.useState(0);
  const [bomLocal, setBomLocal] = React.useState<BomNode[]>([]);

  // allinea BOM locale quando cambia il prodotto
  React.useEffect(() => {
    if (product) setBomLocal((product as any).bom ?? []);
  }, [product]);

  if (!id) {
    return <div className="text-sm text-muted-foreground">ID prodotto mancante.</div>;
  }

  if (!product) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prodotto non trovato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Nessun prodotto con ID <span className="font-mono">{id}</span> nel tuo contesto.
          </div>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Torna indietro
          </Button>
        </CardContent>
      </Card>
    );
  }

  const productTypeLabel =
    ((product as any).type ??
      (product as any).typeId ??
      (product as any).productTypeId ??
      (product as any).productType?.name ??
      "—") as string;

  return (
    <div className="space-y-6">
      {/* Header prodotto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{(product as any).name ?? "Prodotto"}</span>
            <span className="text-sm font-normal text-muted-foreground font-mono">
              {(product as any).id}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Tipo:</span> {productTypeLabel}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            Azienda: {(product as any).companyDid ?? currentUser?.companyDid ?? "—"}
          </div>
        </CardContent>
      </Card>

      {/* Registra evento + assegnazione opzionale (evento a livello di prodotto) */}
      <Card>
        <CardHeader>
          <CardTitle>Registra evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assignee">Assegna a DID (opzionale)</Label>
            <Input
              id="assignee"
              placeholder="did:iota:xyz… (operatore o macchina)"
              value={assigneeDid}
              onChange={(e) => setAssigneeDid(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se valorizzato, l’evento comparirà nella dashboard dell’assegnatario.
            </p>
          </div>

          <EventForm
            defaultProductId={(product as any).id}
            assignedToDid={assigneeDid || undefined}
            onCreated={() => setTimelineKey((k) => k + 1)}
          />
        </CardContent>
      </Card>

      {/* Distinta base (BOM) con persistenza e trigger bom.updated */}
      <Card>
        <CardHeader>
          <CardTitle>Distinta base (BOM)</CardTitle>
        </CardHeader>
        <CardContent>
          <BOMEditor
            value={bomLocal}
            onChange={setBomLocal}
            productId={(product as any).id}
            onSaved={(next) => {
              setBomLocal(next);
              setTimelineKey((k) => k + 1); // refresh timeline dopo salvataggio
            }}
            // autoSave // abilita se vuoi salvataggio automatico
          />
        </CardContent>
      </Card>

      {/* Timeline eventi del prodotto (include product.created/updated, bom.updated, dpp.published, ecc.) */}
      <EventTimeline key={timelineKey} productId={(product as any).id} />
    </div>
  );
}
