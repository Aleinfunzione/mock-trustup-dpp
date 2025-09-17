// /src/components/attributes/AttributeCatalogModal.tsx
import * as React from "react";
import { ATTRIBUTE_CATALOG, AttributeCatalogEntry } from "@/config/attributeCatalog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export type AttributeCatalogModalProps = {
  onSelect: (entry: AttributeCatalogEntry) => void;
  trigger?: React.ReactNode;
  /** opzionale: limita per standard (es. ["ISO"]) */
  allowedStandards?: Array<AttributeCatalogEntry["standard"]>;
};

export default function AttributeCatalogModal({
  onSelect,
  trigger,
  allowedStandards,
}: AttributeCatalogModalProps) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<"ALL" | "EU-DPP" | "GS1" | "ISO">("ALL");

  const list = ATTRIBUTE_CATALOG.filter((c) => {
    const passStandard =
      !allowedStandards || allowedStandards.length === 0 || allowedStandards.includes(c.standard);
    const passFilter = filter === "ALL" || c.standard === filter;
    const passQuery = q.trim() === "" || c.title.toLowerCase().includes(q.toLowerCase());
    return passStandard && passFilter && passQuery;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm">Aggiungi attributi</Button>}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Catalogo Attributi</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-center">
          <Input placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex gap-1">
            {(["ALL", "EU-DPP", "GS1", "ISO"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="h-80 mt-3 pr-2">
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.title}</div>
                  {c.description && (
                    <div className="text-sm text-muted-foreground">{c.description}</div>
                  )}
                  <div className="mt-1 flex gap-2 text-xs">
                    <Badge variant="secondary">{c.standard}</Badge>
                    <Badge variant="outline">v{c.version}</Badge>
                    <Badge variant="outline">ns: {c.namespace}</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    onSelect(c);
                    setOpen(false);
                  }}
                >
                  Seleziona
                </Button>
              </li>
            ))}
            {list.length === 0 && (
              <li className="text-sm text-muted-foreground px-1">Nessun risultato.</li>
            )}
          </ul>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
