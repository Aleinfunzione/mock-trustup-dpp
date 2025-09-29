// src/components/events/EventForm.tsx
import * as React from "react";
import { useState, useEffect, useRef } from "react";
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
import {
  getProduct as getProductSvc,
  listProductsByCompany,
} from "@/services/api/products";

// ---- identity (fallback robusto ai vari nomi funzione/campo)
import * as IdentityApi from "@/services/api/identity";

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
  path: string[];
  isGroup: boolean;
};

type Actor = {
  did: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  fullName?: string;
  name?: string;
  username?: string;
  email?: string;
  [k: string]: any;
};

function isOperatorRole(r?: string) {
  const x = (r || "").toLowerCase();
  return x.includes("operator") || x.includes("machine") || x.includes("macchin");
}

async function getCompanyActors(companyDid: string): Promise<Actor[]> {
  const api: any = IdentityApi as any;
  const fn =
    api.listCompanyMembers ||
    api.listMembersByCompany ||
    api.listByCompany ||
    api.listMembers ||
    api.list ||
    null;

  try {
    const res = typeof fn === "function" ? fn(companyDid) : [];
    const arr = Array.isArray(res) ? res : await Promise.resolve(res);
    if (!Array.isArray(arr)) return [];
    return arr.map((a: any) => ({
      did: a.did || a.id || "",
      role: a.role || a.type || a.kind,
      firstName: a.firstName || a.givenName || a.nome,
      lastName: a.lastName || a.familyName || a.cognome,
      displayName: a.displayName || a.name || a.fullName,
      fullName: a.fullName,
      username: a.username,
      email: a.email,
    }));
  } catch {
    return [];
  }
}

function actorLabel(a: Actor) {
  const nameCandidates = [
    a.displayName,
    [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || undefined,
    a.fullName,
    a.name,
    a.username,
    a.email ? String(a.email).split("@")[0] : undefined,
  ].filter(Boolean) as string[];
  const name = nameCandidates.find((s) => s && s !== a.did) || "Operatore";
  const role = a.role ? ` • ${a.role}` : "";
  return `${name} — ${a.did}${role}`;
}

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

  // prodotto / lista prodotti
  const [productId, setProductId] = useState<string>(defaultProductId ?? "");
  const [products, setProducts] = useState<Product[]>([]);

  // evento
  const [eventType, setEventType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [customType, setCustomType] = useState<string>("");

  // ambito BOM
  const [scope, setScope] = useState<Scope>("product");
  const [targetNodeId, setTargetNodeId] = useState<string>("");
  const [bomOptions, setBomOptions] = useState<BomOption[]>([]);

  // assegnazione
  const [assignee, setAssignee] = useState<string>("");
  const [actors, setActors] = useState<Actor[]>([]);

  // vari
  const [submitting, setSubmitting] = useState(false);

  const listMineRef = useRef(listMine);
  useEffect(() => {
    listMineRef.current = listMine;
  }, [listMine]);

  // prefill prodotto se arriva da props (non blocca la select)
  useEffect(() => {
    if (defaultProductId) setProductId(defaultProductId);
  }, [defaultProductId]);

  // carica prodotti: prima hook, poi fallback per company
  useEffect(() => {
    const load = async () => {
      let list: Product[] = [];
      try {
        if (typeof listMineRef.current === "function") {
          list = (listMineRef.current() as Product[]) || [];
        }
      } catch {}
      if ((!list || list.length === 0) && (currentUser?.companyDid || currentUser?.did)) {
        try {
          list = listProductsByCompany(currentUser!.companyDid || currentUser!.did) || [];
        } catch {}
      }
      setProducts(
        [...(list || [])].sort(
          (a: any, b: any) => (b?.updatedAt ?? "").localeCompare(a?.updatedAt ?? "")
        )
      );
    };
    load();
  }, [currentUser?.companyDid, currentUser?.did]);

  // auto-select primo prodotto se vuoto
  useEffect(() => {
    if (!defaultProductId && !productId && products.length > 0) {
      setProductId(products[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, defaultProductId]);

  // carica e flattenta BOM
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
    if (targetNodeId && !opts.find((o) => o.id === targetNodeId)) {
      setTargetNodeId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // carica attori della stessa azienda
  useEffect(() => {
    const companyDid = currentUser?.companyDid || currentUser?.did;
    if (!companyDid) return;
    getCompanyActors(companyDid).then((all) => {
      const filtered = all.filter((a) => isOperatorRole(a.role));
      setActors(filtered);
    });
  }, [currentUser?.companyDid, currentUser?.did]);

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
        companyDid: currentUser.companyDid ?? currentUser.did,
        actorDid: currentUser.did,
        type: effectiveType,
        notes: notes.trim() || undefined,
        assignedToDid: assignedToDid || assignee || undefined,
        ...( {
          data: {
            scope,
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
      setAssignee("");

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
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger id="product" aria-label="Seleziona prodotto">
                <SelectValue placeholder="Seleziona un prodotto" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
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
              <SelectContent className="z-[60]">
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

          {/* Ambito */}
          <div className="space-y-2">
            <Label htmlFor="scope">Ambito</Label>
            <Select value={scope} onValueChange={(v: Scope) => setScope(v)}>
              <SelectTrigger id="scope" aria-label="Seleziona ambito">
                <SelectValue placeholder="Seleziona l'ambito" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="product">Prodotto intero</SelectItem>
                <SelectItem value="bom">Nodo BOM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nodo BOM */}
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
                <SelectContent className="z-[60]">
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

          {/* Assegnazione */}
          {assignedToDid ? (
            <div className="space-y-1 text-sm">
              <span className="text-muted-foreground">Assegnato a:</span>{" "}
              <span className="font-mono">{assignedToDid}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="assignee">Assegna a (operatore/macchina)</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger id="assignee" aria-label="Seleziona assegnatario">
                  <SelectValue placeholder="Seleziona un operatore o una macchina" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  {actors.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Nessun operatore/macchina disponibile
                    </div>
                  ) : (
                    actors.map((a) => (
                      <SelectItem key={a.did} value={a.did}>
                        {actorLabel(a)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <CardFooter className="px-0">
            <Button type="submit" className="w-full" disabled={!canSubmit || submitting}>
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
    const labelBase = (n as any).placeholderName?.trim?.() || (n as any).componentRef || n.id;
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
