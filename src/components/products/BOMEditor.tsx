import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { BomNode } from "@/types/product";
import { updateProduct } from "@/services/api/products";

/** id random per i nodi BOM */
function rid(bytes = 6): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type BomEditorProps = {
  value: BomNode[];
  onChange: (next: BomNode[]) => void;

  /** Se valorizzato, abilita la persistenza diretta sul prodotto e mostra il pulsante "Salva BOM". */
  productId?: string;

  /** Se true, salva automaticamente le modifiche dopo un breve debounce (default: false). */
  autoSave?: boolean;

  /** Callback dopo salvataggio OK (manuale o auto). */
  onSaved?: (next: BomNode[]) => void;
};

export default function BOMEditor({ value, onChange, productId, autoSave = false, onSaved }: BomEditorProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveBaseline = useRef<string>(JSON.stringify(value));
  const debounceRef = useRef<number | null>(null);

  function markDirty() {
    setDirty(true);
  }

  async function persistBom(next?: BomNode[]) {
    if (!productId) return; // modalità "solo editor", nessun salvataggio
    const payload = (next ?? value) as BomNode[];
    try {
      setSaving(true);
      await Promise.resolve(updateProduct(productId, { bom: payload }));
      saveBaseline.current = JSON.stringify(payload);
      setDirty(false);
      onSaved?.(payload);
      toast({ title: "BOM salvata", description: `Componenti: ${payload.length}` });
    } catch (e: any) {
      toast({
        title: "Errore salvataggio BOM",
        description: e?.message ?? "Impossibile salvare la distinta base.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  // Debounce autosave
  useEffect(() => {
    if (!autoSave || !productId) return;
    if (!dirty) return;
    if (saving) return;

    // salva dopo 800ms di inattività
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      persistBom();
    }, 800);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, dirty, autoSave, productId, saving]);

  // Reset baseline se cambia il prodotto
  useEffect(() => {
    saveBaseline.current = JSON.stringify(value);
    setDirty(false);
  }, [productId]);

  function addRoot() {
    const node: BomNode = { id: `bom_${rid()}`, placeholderName: "", quantity: 1, children: [] };
    const next = [...(value ?? []), node];
    onChange(next);
    markDirty();
  }
  function updateNode(id: string, patch: Partial<BomNode>) {
    const next = updateTree(value, id, patch);
    onChange(next);
    markDirty();
  }
  function addChild(id: string) {
    const child: BomNode = { id: `bom_${rid()}`, placeholderName: "", quantity: 1, children: [] };
    const parent = findNode(value, id);
    const next = updateTree(value, id, {
      children: [...(parent?.children ?? []), child],
    });
    onChange(next);
    markDirty();
  }
  function removeNode(id: string) {
    const next = removeFromTree(value, id);
    onChange(next);
    markDirty();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Distinta base (BOM)</Label>
        <div className="flex items-center gap-2">
          {productId && (
            <Button type="button" variant="secondary" onClick={() => persistBom()} disabled={!dirty || saving}>
              {saving ? "Salvo…" : "Salva BOM"}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={addRoot}>
            Aggiungi componente
          </Button>
        </div>
      </div>

      <div className="rounded-md border divide-y">
        {(value ?? []).length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">Nessun componente nel BOM.</div>
        ) : (
          value.map((n) => (
            <NodeEditor
              key={n.id}
              node={n}
              depth={0}
              onUpdate={(patch) => updateNode(n.id, patch)}
              onAddChild={() => addChild(n.id)}
              onRemove={() => removeNode(n.id)}
            />
          ))
        )}
      </div>

      {productId && dirty && (
        <p className="text-[11px] text-muted-foreground">
          Modifiche non salvate {autoSave ? "(salvataggio automatico attivo…)" : "(clicca “Salva BOM”)"}.
        </p>
      )}
    </div>
  );
}

function NodeEditor({
  node,
  depth,
  onUpdate,
  onAddChild,
  onRemove,
}: {
  node: BomNode;
  depth: number;
  onUpdate: (patch: Partial<BomNode>) => void;
  onAddChild: () => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(node.placeholderName ?? "");
  const [qty, setQty] = useState<number>(node.quantity ?? 1);

  // Nota: in MOCK usiamo solo placeholderName; componentRef potrà essere abilitato in seguito
  return (
    <div className="p-3" style={{ paddingLeft: `${Math.min(depth, 6) * 12}px` }}>
      <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto_auto] sm:items-end">
        <div className="space-y-1">
          <Label className="text-xs">Nome componente</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => onUpdate({ placeholderName: name })}
            placeholder="Es. Vite, vite M6, ecc…"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Quantità</Label>
          <Input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            onBlur={() => onUpdate({ quantity: qty })}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onAddChild}>
            + Sotto-componente
          </Button>
          <Button type="button" variant="destructive" onClick={onRemove}>
            Rimuovi
          </Button>
        </div>
      </div>

      {(node.children ?? []).length > 0 && (
        <div className="mt-3 space-y-2">
          {node.children!.map((ch) => (
            <NodeEditor
              key={ch.id}
              node={ch}
              depth={depth + 1}
              onUpdate={(patch) =>
                onUpdate({
                  children: (node.children ?? []).map((x) => (x.id === ch.id ? { ...x, ...patch } : x)),
                })
              }
              onAddChild={() =>
                onUpdate({
                  children: [...(node.children ?? []), { id: `bom_${rid()}`, placeholderName: "", quantity: 1, children: [] }],
                })
              }
              onRemove={() =>
                onUpdate({
                  children: (node.children ?? []).filter((x) => x.id !== ch.id),
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- tree helpers ---------------- */

function findNode(tree: BomNode[], id: string): BomNode | undefined {
  for (const n of tree ?? []) {
    if (n.id === id) return n;
    const f = findNode(n.children ?? [], id);
    if (f) return f;
  }
  return undefined;
}

function updateTree(tree: BomNode[], id: string, patch: Partial<BomNode>): BomNode[] {
  return (tree ?? []).map((n) => {
    if (n.id === id) return { ...n, ...patch };
    return { ...n, children: updateTree(n.children ?? [], id, patch) };
  });
}

function removeFromTree(tree: BomNode[], id: string): BomNode[] {
  return (tree ?? [])
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: removeFromTree(n.children ?? [], id) }));
}
