// src/pages/products/ProductEventsPage.tsx
import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { useAuth } from "@/hooks/useAuth";
import ProductNavMenu from "@/components/products/ProductNavMenu";
import EventForm from "@/components/events/EventForm";
import EventTimeline from "@/components/events/EventTimeline";
import { getProductById } from "@/services/api/products";

export default function ProductEventsPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const roleBase = currentUser?.role === "company" ? "/company" : "/creator";
  const basePath = `${roleBase}/products`;

  const [assigneeDid, setAssigneeDid] = React.useState("");
  const [timelineKey, setTimelineKey] = React.useState(0);
  const [name, setName] = React.useState<string>("");

  React.useEffect(() => {
    if (!id) return;
    try {
      const p = getProductById(id as string) as any;
      setName(p?.name || p?.title || id);
    } catch {
      setName(id);
    }
  }, [id]);

  if (!id) {
    return (
      <Card>
        <CardHeader><CardTitle>Prodotto non specificato</CardTitle></CardHeader>
        <CardContent><Button asChild variant="outline"><Link to={basePath}>Indietro</Link></Button></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ProductNavMenu roleBase={roleBase} productId={id} />

      {/* Breadcrumb + back */}
      <div className="flex items-center justify-between">
        <nav className="text-sm text-muted-foreground">
          <Link to={basePath} className="hover:underline">Prodotti</Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">Eventi</span>
        </nav>
        <Button asChild variant="ghost" size="sm">
          <Link to={`${roleBase}/products/${id}`}>Indietro</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registra evento</CardTitle>
          <CardDescription>Progetto <span className="font-mono">{name}</span></CardDescription>
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
            defaultProductId={id}
            assignedToDid={assigneeDid || undefined}
            onCreated={() => setTimelineKey((k) => k + 1)}
          />
        </CardContent>
      </Card>

      <EventTimeline key={timelineKey} productId={id} />
    </div>
  );
}
