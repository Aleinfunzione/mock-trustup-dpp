// src/pages/products/ProductEventsPage.tsx
import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

import { useAuth } from "@/hooks/useAuth";
import ProductTopBar from "@/components/products/ProductTopBar";
import EventForm from "@/components/events/EventForm";
import EventTimeline from "@/components/events/EventTimeline";
import { getProductById } from "@/services/api/products";
import type { BomNode } from "@/types/product";

type Option = { id: string; label: string };

function flattenBOM(nodes: BomNode[] | undefined, prefix = "", acc: Option[] = []): Option[] {
  if (!Array.isArray(nodes)) return acc;
  nodes.forEach((n, idx) => {
    const seg = `${prefix}${idx + 1}`;
    const title = (n as any).name ?? (n as any).title ?? (n as any).id ?? "nodo";
    const id = String((n as any).id ?? seg);
    acc.push({ id, label: `${seg} · ${String(title)}` });
    if ((n as any).children?.length) flattenBOM((n as any).children, `${seg}.`, acc);
  });
  return acc;
}

export default function ProductEventsPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const roleBase = currentUser?.role === "company" ? "/company" : "/creator";
  const basePath = `${roleBase}/products`;

  const [assigneeDid, setAssigneeDid] = React.useState("");
  const [timelineKey, setTimelineKey] = React.useState(0);
  const [name, setName] = React.useState<string>("");
  const [bomOptions, setBomOptions] = React.useState<Option[]>([]);
  const [bomNodeId, setBomNodeId] = React.useState<string>("");

  React.useEffect(() => {
    if (!id) return;
    try {
      const p = getProductById(id as string) as any;
      setName(p?.name || p?.title || id);
      setBomOptions(flattenBOM(p?.bom));
    } catch {
      setName(id);
      setBomOptions([]);
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
      <ProductTopBar roleBase={roleBase} productId={id} />

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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nodo BOM (opzionale)</Label>
              <Select value={bomNodeId} onValueChange={setBomNodeId}>
                <SelectTrigger><SelectValue placeholder="Tutto il prodotto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tutto il prodotto</SelectItem>
                  {bomOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <EventForm
            defaultProductId={id}
            assignedToDid={assigneeDid || undefined}
            {...({ bomNodeId: bomNodeId || undefined } as any)}
            onCreated={() => setTimelineKey((k) => k + 1)}
          />
        </CardContent>
      </Card>

      {/* Timeline filtrabile per nodo */}
      <EventTimeline
        key={timelineKey}
        productId={id}
        {...({ bomNodeId: bomNodeId || undefined } as any)}
      />
    </div>
  );
}
