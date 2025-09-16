import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

import { useEvents } from "@/hooks/useEvents";
import { useProducts } from "@/hooks/useProducts";
import { useAuthStore } from "@/stores/authStore";
import { EVENT_TYPES } from "@/utils/constants";
import type { Product, BomNode } from "@/types/product";
import { getProduct as getProductSvc } from "@/services/api/products";

type EventFormProps = {
  defaultProductId?: string;
  assignedToDid?: string;
  onCreated?: (eventId: string) => void;
  compact?: boolean;
};

type Scope = "product" | "bom";

type BomOption = {
  id: string;
  label: string;
  path: string[];     // path di id dal root al nodo
  isGroup: boolean;   // true se ha children
};

export default function EventForm({
  defaultProductId,
  assignedToDid,
  onCreated,
  compact,
}: EventFormProps) {
  const { toast } = useToast();
  const { currentUser } = useAuthStore();
  const { listMine } = useProducts();
  const { createEvent } = useEvents();

  const [productId, setProductId] = useState<string>(defaultProductId ?? "");
  const [eventType, setEventType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [customType, setCustomType] = useState<string>("");

  // Ambito + target BOM
  const [scope, setScope] = useState<Scope>("product");
  const [targetNodeId, setTargetNodeId] = useState<string>("");
  const [bomOptions, setBomOptions] = useState<BomOption[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // Sync productId quando cambia defaultProductId (es. cambio rotta)
  useEffect(() => {
    if (defaultProductId) setProductId(defaultProductId);
  }, [defaultProductId]);

  // Prodotti disponibili (miei)
  const products: Product[] = useMemo(
    () => (typeof listMine === "function" ? listMine() : []),
    [listMine]
  );

  // Carica/flatten BOM del prodotto selezionato
  useEffect(() => {
    if (!productId) {
      setBomOptions([]);
      setTargetNodeId("");
      return;
    }
    const prod = getProductSvc(productId);
    const bom = (prod?.bom ?? []) as BomNode[];
    const opts = flattenBOM(bom);
    setBomOptions(opts);
    // se il target selezionato non esiste più, reset
    if (targetNodeId && !opts.find((o) => o.id === targetNodeId)) {
      setTargetNodeId("");
    }
  }, [productId, targetNodeId]);

  const allowedTypes =
    Array.isArray(EVENT_TYPES) && EVENT_TYPES.length
      ? [...EVENT_TYPES, "Altro"]
      : ["Produzione", "Ispezione", "Spedizione", "Riciclo", "Altro"];

  const effectiveType = eventType === "Altro" ? customType.trim() : eventType.trim();

  const canSubmit =
    !submitting &&
    !!currentUser?.did &&
    productId.length > 0 &&
    effectiveType.length > 0 &&
    (scope === "product" || (scope === "bom" && targetNodeId.length > 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!currentUser?.did) {
      toast({ title: "Utente non autenticato", description: "Effettua il login.", variant: "destructive" });
      return;
    }
    if (!productId) {
      toast({ title: "Seleziona un prodotto", variant: "destructive" });
      return;
    }
    if (!effectiveType) {
      toast({ title: "Seleziona o inserisci un tipo evento", variant: "destructive" });
      return;
    }
    if (scope === "bom" && !targetNodeId) {
      toast({ title: "Seleziona un nodo della BOM", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const targetMeta =
        scope === "bom"
          ? bomOptions.find((o) => o.id === targetNodeId) || null
          : null;

      const evt = await createEvent({
        productId,
        companyDid: currentUser.companyDid ?? currentUser.did, // fallback sicuro
        actorDid: currentUser.did,
        type: effectiveType,
        notes: notes.trim() || undefined,
        assignedToDid,
        // Metadati ambito/target: cast per compatibilità con il typing dell'hook
        ...( {
          data: {
            scope, // "product" | "bom"
            targetNodeId: scope === "bom" ? targetNodeId : undefined,
            targetPath: scope === "bom" ? targetMeta?.path : undefined,
            targetLabel: scope === "bom" ? targetMeta?.label : undefined,
          },
        } as any ),
      });

      toast({
        title: "Evento registrato",
        description:
          `#${evt.id} • ${effectiveType}` +
          (scope === "bom" && targetMeta?.label ? ` • BOM: ${targetMeta.label}` : ""),
      });

      if (!defaultProductId) setProductId("");
      setEventType("");
      setCustomType("");
      setNotes("");
      setScope("product");
      setTargetNodeId("");

      onCreated?.(evt.id);
    } catch (err: any) {
      toast({
        title: "Impossibile creare l’evento",
        description: err?.message ?? "Errore inatteso",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className={compact ? "w-full" : "w-full max-w-2xl"}>
      {!compact && (
        <CardHeader>
          <CardTitle>Registra evento</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Prodotto */}
          <div className="space-y-2">
            <Label htmlFor="product">Prodotto</Label>
            <Select value={productId} onValueChange={setProductId} disabled={!!defaultProductId}>
              <SelectTrigger id="product" aria-label="Seleziona prodotto">
                <SelectValue placeholder="Seleziona un prodotto" />
              </SelectTrigger>
              <SelectContent>
                {products.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nessun prodotto disponibile</div>
                ) : (
                  products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger id="type" aria-label="Seleziona tipo evento">
                <SelectValue placeholder="Seleziona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {allowedTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo custom */}
          {eventType === "Altro" && (
            <div className="space-y-2">
              <Label htmlFor="customType">Specifica il tipo</Label>
              <Input
                id="customType"
                placeholder="Es. Manutenzione, Telemetria, …"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
              />
            </div>
          )}

          {/* Ambito: Prodotto / Nodo BOM */}
          <div className="space-y-2">
            <Label htmlFor="scope">Ambito</Label>
            <Select value={scope} onValueChange={(v: Scope) => setScope(v)}>
              <SelectTrigger id="scope" aria-label="Seleziona ambito">
                <SelectValue placeholder="Seleziona l'ambito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Prodotto intero</SelectItem>
                <SelectItem value="bom">Nodo BOM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nodo BOM (visibile solo se ambito = "bom") */}
          {scope === "bom" && (
            <div className="space-y-2">
              <Label htmlFor="targetNode">Seleziona nodo BOM</Label>
              <Select
                value={targetNodeId}
                onValueChange={setTargetNodeId}
                disabled={bomOptions.length === 0}
              >
                <SelectTrigger id="targetNode" aria-label="Seleziona nodo BOM">
                  <SelectValue placeholder={bomOptions.length ? "Scegli un nodo" : "Nessun nodo disponibile"} />
                </SelectTrigger>
                <SelectContent>
                  {bomOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      La BOM del prodotto è vuota.
                    </div>
                  ) : (
                    bomOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Puoi associare l’evento a un componente specifico (o gruppo) della BOM.
              </p>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note (opzionale)</Label>
            <Textarea
              id="notes"
              placeholder="Dettagli, esito, riferimenti interni…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Assegnazione (solo display se passata come prop) */}
          {assignedToDid && (
            <div className="space-y-1 text-sm">
              <span className="text-muted-foreground">Assegnato a:</span>{" "}
              <span className="font-mono">{assignedToDid}</span>
            </div>
          )}

          <CardFooter className="px-0">
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {submitting ? "Salvataggio…" : "Registra evento"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}

/* ---------------- helpers ---------------- */

function flattenBOM(nodes: BomNode[], path: string[] = [], depth = 0): BomOption[] {
  const out: BomOption[] = [];
  for (const n of nodes ?? []) {
    const labelBase = n.placeholderName?.trim() || n.componentRef || n.id;
    const indent = "—".repeat(Math.min(depth, 6));
    const label = (indent ? `${indent} ` : "") + labelBase + (n.children?.length ? " (gruppo)" : "");
    const thisPath = [...path, n.id];
    out.push({
      id: n.id,
      label,
      path: thisPath,
      isGroup: !!(n.children && n.children.length),
    });
    if (n.children?.length) {
      out.push(...flattenBOM(n.children, thisPath, depth + 1));
    }
  }
  return out;
}
