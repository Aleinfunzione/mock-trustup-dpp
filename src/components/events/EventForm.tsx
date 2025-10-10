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
import { getProduct as getProductSvc, listProductsByCompany } from "@/services/api/products";

// identity fallback
import * as IdentityApi from "@/services/api/identity";

// crediti orchestrati
import { canAfford, consume, costOf } from "@/services/orchestration/creditsPublish";
import type { AccountOwnerType, ConsumeActor } from "@/types/credit";

// org: assegnazioni (solo assignments qui)
import { listAssignments } from "@/stores/orgStore";

// isole: fonte unica = companyAttributes
import { getCompanyAttrs } from "@/services/api/companyAttributes";

// annotazione tx
import { annotateTx } from "@/stores/creditTx";

type EventFormProps = {
  defaultProductId?: string;
  assignedToDid?: string;
  onCreated?: (eventId: string) => void;
  compact?: boolean;
};

type Scope = "product" | "bom";
type TargetKind = "member" | "island";

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

function fmtCredits(n: number) {
  if (!Number.isFinite(n)) return String(n);
  const s = n.toFixed(3);
  return s.replace(/\.?0+$/, "");
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

  const [productId, setProductId] = useState<string>(defaultProductId ?? "");
  const [products, setProducts] = useState<Product[]>([]);
  const [productIslandId, setProductIslandId] = useState<string | undefined>(undefined);

  const [eventType, setEventType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [customType, setCustomType] = useState<string>("");

  const [scope, setScope] = useState<Scope>("product");
  const [targetNodeId, setTargetNodeId] = useState<string>("");
  const [bomOptions, setBomOptions] = useState<BomOption[]>([]);

  const [targetKind, setTargetKind] = useState<TargetKind>("member");
  const [islandId, setIslandId] = useState<string>("");
  const [islands, setIslands] = useState<Array<{ id: string; name: string }>>([]);

  const [assignee, setAssignee] = useState<string>("");
  const [actors, setActors] = useState<Actor[]>([]);

  const [canPay, setCanPay] = useState<boolean>(true);
  const eventCost = costOf("EVENT_CREATE" as any);

  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const listMineRef = useRef(listMine);
  useEffect(() => {
    listMineRef.current = listMine;
  }, [listMine]);

  useEffect(() => {
    if (defaultProductId) setProductId(defaultProductId);
  }, [defaultProductId]);

  useEffect(() => {
    const load = async () => {
      let list: Product[] = [];
      try {
        if (typeof listMineRef.current === "function") list = (listMineRef.current() as Product[]) || [];
      } catch {}
      if ((!list || list.length === 0) && (currentUser?.companyDid || currentUser?.did)) {
        try {
          list = listProductsByCompany(currentUser!.companyDid || currentUser!.did) || [];
        } catch {}
      }
      setProducts(
        [...(list || [])].sort((a: any, b: any) => (b?.updatedAt ?? "").localeCompare(a?.updatedAt ?? ""))
      );
    };
    load();
  }, [currentUser?.companyDid, currentUser?.did]);

  useEffect(() => {
    if (!defaultProductId && !productId && products.length > 0) setProductId(products[0].id);
  }, [products, defaultProductId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!productId) {
      setBomOptions([]);
      setTargetNodeId("");
      setProductIslandId(undefined);
      return;
    }
    const prod = getProductSvc(productId);
    const bom = (prod?.bom ?? []) as BomNode[];
    const opts = flattenBOM(bom);
    setBomOptions(opts);
    setProductIslandId((prod as any)?.islandId);
    if (targetNodeId && !opts.find((o) => o.id === targetNodeId)) setTargetNodeId("");
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Isole dalla stessa fonte della pagina Isole
  useEffect(() => {
    const cid = currentUser?.companyDid || currentUser?.did;
    if (!cid) return;
    const isl = getCompanyAttrs(cid)?.islands ?? [];
    setIslands(isl.map((i: any) => ({ id: i.id, name: i.name || i.id })));
    if (!islandId && productIslandId && isl.some((i: any) => i.id === productIslandId)) {
      setIslandId(productIslandId);
    }
  }, [currentUser?.companyDid, currentUser?.did, productIslandId, islandId]);

  // Attori filtrati per isola se targetKind=member
  useEffect(() => {
    const companyDid = currentUser?.companyDid || currentUser?.did;
    if (!companyDid) return;
    (async () => {
      const all = (await getCompanyActors(companyDid)).filter((a) => isOperatorRole(a.role));
      const filterIsland = targetKind === "member" ? (islandId || productIslandId) : undefined;
      if (filterIsland) {
        const asg = listAssignments(companyDid);
        const allowed = new Set(asg.filter((a) => a.islandId === filterIsland).map((a) => a.did));
        const filtered = all.filter((a) => allowed.has(a.did));
        setActors(filtered.length ? filtered : all);
      } else {
        setActors(all);
      }
    })();
  }, [currentUser?.companyDid, currentUser?.did, targetKind, islandId, productIslandId]);

  // credito disponibile
  useEffect(() => {
    let alive = true;
    async function checkCredits() {
      if (!currentUser?.did) return setCanPay(true);
      try {
        const u = currentUser as any;
        const actor: ConsumeActor = {
          ownerType: (currentUser?.role ?? "company") as AccountOwnerType,
          ownerId: (u?.id ?? u?.did) as string,
          companyId: (u?.companyId ?? u?.companyDid) as string | undefined,
        };
        const ok = await canAfford("EVENT_CREATE" as any, actor);
        if (alive) setCanPay(ok);
      } catch {
        if (alive) setCanPay(false);
      }
    }
    checkCredits();
    return () => {
      alive = false;
    };
  }, [currentUser?.did, currentUser?.companyDid, currentUser?.role]);

  const allowedTypes =
    Array.isArray(EVENT_TYPES) && EVENT_TYPES.length
      ? [...EVENT_TYPES, "Altro"]
      : ["Produzione", "Ispezione", "Spedizione", "Riciclo", "Altro"];

  const effectiveType = eventType === "Altro" ? customType.trim() : eventType.trim();

  const targetValid =
    !!assignedToDid ||
    (targetKind === "member" ? assignee.length > 0 : islandId.length > 0);

  const canSubmit =
    !submitting &&
    canPay &&
    !!currentUser?.did &&
    productId.length > 0 &&
    effectiveType.length > 0 &&
    (scope === "product" || (scope === "bom" && targetNodeId.length > 0)) &&
    targetValid;

  async function buildActor(): Promise<ConsumeActor | null> {
    if (!currentUser?.did) return null;
    const u = currentUser as any;
    return {
      ownerType: (currentUser?.role ?? "company") as AccountOwnerType,
      ownerId: (u?.id ?? u?.did) as string,
      companyId: (u?.companyId ?? u?.companyDid) as string | undefined,
    };
  }

  async function attemptFlow(): Promise<string | null> {
    const actor = await buildActor();
    if (!actor) {
      toast({ title: "Utente non autenticato", description: "Effettua il login.", variant: "destructive" });
      return null;
    }
    const targetMeta = scope === "bom" ? bomOptions.find((o) => o.id === targetNodeId) || null : null;
    const assigned = assignedToDid || (targetKind === "member" ? assignee : undefined);
    const chosenIslandId =
      targetKind === "island" && islandId ? islandId : productIslandId || undefined;

    const ok = await canAfford("EVENT_CREATE" as any, actor);
    if (!ok) {
      setCanPay(false);
      throw Object.assign(new Error("Crediti insufficienti"), { code: "INSUFFICIENT_CREDITS" });
    }

    // consume → txRef
    const consumeRes: any = await consume(
      "EVENT_CREATE" as any,
      actor,
      {
        kind: "event",
        productId,
        type: effectiveType,
        scope,
        nodeId: scope === "bom" ? targetNodeId : undefined,
        targetPath: scope === "bom" ? targetMeta?.path : undefined,
        targetLabel: scope === "bom" ? targetMeta?.label : undefined,
        islandId: chosenIslandId,
        assignedToDid: assigned,
      }
    );
    const txRef: string | undefined = consumeRes?.tx?.id;

    // create event → salva txRef e poi annota tx con eventId
    const evt = await createEvent({
      productId,
      companyDid: currentUser!.companyDid ?? currentUser!.did,
      actorDid: currentUser!.did,
      type: effectiveType,
      notes: notes.trim() || undefined,
      assignedToDid: assigned,
      ...( {
        data: {
          scope,
          targetNodeId: scope === "bom" ? targetNodeId : undefined,
          targetPath: scope === "bom" ? targetMeta?.path : undefined,
          targetLabel: scope === "bom" ? targetMeta?.label : undefined,
          islandId: chosenIslandId,
          txRef,
        },
      } as any ),
    });

    if (txRef) {
      try {
        annotateTx(txRef, { ref: { eventId: evt.id, productId, islandId: chosenIslandId } });
      } catch {
        // best-effort
      }
    }

    toast({
      title: "Evento registrato",
      description:
        `#${evt.id} • ${effectiveType}` +
        (scope === "bom" && targetMeta?.label ? ` • BOM: ${targetMeta.label}` : "") +
        (chosenIslandId ? ` • Isola: ${chosenIslandId}` : "") +
        ` • costo ${fmtCredits(eventCost)} crediti`,
    });

    if (!defaultProductId) setProductId("");
    setEventType("");
    setCustomType("");
    setNotes("");
    setScope("product");
    setTargetNodeId("");
    setAssignee("");
    if (targetKind === "island") setIslandId("");

    onCreated?.(evt.id);
    return evt.id;
  }

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
    if (
      !(
        !!assignedToDid ||
        (targetKind === "member" ? assignee.length > 0 : islandId.length > 0)
      )
    ) {
      toast({ title: "Seleziona destinatario", description: "Membro/macchina oppure un’isola.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await attemptFlow();
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

  async function handleRetry() {
    setRetrying(true);
    try {
      const actor = await buildActor();
      if (!actor) return;
      const ok = await canAfford("EVENT_CREATE" as any, actor);
      if (!ok) {
        setCanPay(false);
        toast({ title: "Saldo ancora insufficiente", description: "Ricarica il conto o cambia sponsor." , variant: "destructive" });
        return;
      }
      setCanPay(true);
      await attemptFlow();
    } catch (err: any) {
      toast({
        title: "Riprova fallita",
        description: err?.message ?? "Errore inatteso",
        variant: "destructive",
      });
    } finally {
      setRetrying(false);
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
            {productIslandId && (
              <p className="text-xs text-muted-foreground">
                Isola prodotto: <span className="font-mono">{productIslandId}</span>
              </p>
            )}
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
              <p className="text-xs text-muted-foreground">Puoi associare l’evento a un componente specifico o gruppo.</p>
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

          {/* Destinatario */}
          {!assignedToDid && (
            <>
              <div className="space-y-2">
                <Label htmlFor="targetKind">Destinatario</Label>
                <Select value={targetKind} onValueChange={(v: TargetKind) => { setTargetKind(v); }}>
                  <SelectTrigger id="targetKind" aria-label="Seleziona destinatario">
                    <SelectValue placeholder="Seleziona destinatario" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="member">Membro/Macchina</SelectItem>
                    <SelectItem value="island">Isola</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetKind === "island" ? (
                <div className="space-y-2">
                  <Label htmlFor="island">Isola</Label>
                  <Select value={islandId} onValueChange={setIslandId}>
                    <SelectTrigger id="island" aria-label="Seleziona isola">
                      <SelectValue placeholder="Seleziona un’isola" />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      {islands.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Nessuna isola definita</div>
                      ) : (
                        islands.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name} ({i.id})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {productIslandId && (
                    <p className="text-xs text-muted-foreground">
                      Suggerita dal prodotto: <span className="font-mono">{productIslandId}</span>
                    </p>
                  )}
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
                  {(islandId || productIslandId) && (
                    <p className="text-xs text-muted-foreground">
                      Filtro isola:{" "}
                      <span className="font-mono">{islandId || productIslandId}</span>
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {assignedToDid && (
            <div className="space-y-1 text-sm">
              <span className="text-muted-foreground">Assegnato a:</span>{" "}
              <span className="font-mono">{assignedToDid}</span>
            </div>
          )}

          <CardFooter className="px-0 flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Costo azione: <span className="font-mono">{fmtCredits(eventCost)}</span> crediti
              {!canPay && <span className="text-destructive ml-2">• crediti insufficienti</span>}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {!canPay && (
                <Button type="button" variant="outline" onClick={handleRetry} disabled={retrying}>
                  {retrying ? "Verifica credito…" : "Riprova pagamento"}
                </Button>
              )}
              <Button type="submit" className="w-full sm:w-auto" disabled={!canSubmit || submitting}>
                {submitting ? "Salvataggio…" : "Registra evento"}
              </Button>
            </div>
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
