// src/components/common/IslandFilter.tsx
import * as React from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { getCompanyAttrs } from "@/services/api/companyAttributes";
import {
  getIslandFilter,
  subscribeIsland,
  setIslandId,
  clearIslandFilter,
  type IslandFilterState,
} from "@/stores/uiStore";

type Props = { className?: string; compact?: boolean };

export default function IslandFilter({ className, compact }: Props) {
  const { currentUser } = useAuthStore();
  const [state, setState] = React.useState<IslandFilterState>(getIslandFilter());
  const [islands, setIslands] = React.useState<Array<{ id: string; name: string }>>([]);

  React.useEffect(() => {
    const cid = currentUser?.companyDid || currentUser?.did;
    if (!cid) return;
    const attrs = getCompanyAttrs(cid);
    const list = Array.isArray(attrs?.islands) ? attrs!.islands : [];
    setIslands(list.map((i: any) => ({ id: i.id, name: i.name || i.id })));
  }, [currentUser?.companyDid, currentUser?.did]);

  React.useEffect(() => {
    return subscribeIsland((s) => setState(s));
  }, []);

  const value = state.enabled ? state.islandId ?? "" : "";

  return (
    <div className={`flex flex-col sm:flex-row sm:items-end gap-2 ${className || ""}`}>
      <div className="space-y-1">
        {!compact && <Label htmlFor="islandFilter">Filtro isola</Label>}
        <Select
          value={value}
          onValueChange={(v) => {
            if (!v) clearIslandFilter();
            else setIslandId(v);
          }}
        >
          <SelectTrigger id="islandFilter" className="w-64">
            <SelectValue placeholder="Tutte le isole" />
          </SelectTrigger>
          <SelectContent className="z-[60]">
            <SelectItem value="">Tutte le isole</SelectItem>
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
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => clearIslandFilter()} disabled={!state.enabled}>
          Azzera
        </Button>
        {state.enabled && state.islandId && (
          <span className="text-xs text-muted-foreground self-center">
            Attivo: <span className="font-mono">{state.islandId}</span>
          </span>
        )}
      </div>
    </div>
  );
}
