// src/pages/creator/events/index.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { listEvents } from "@/services/api/events";
import { EVENT_TYPES } from "@/utils/constants";

type EventRec = {
  id: string;
  type: string;
  productId: string;
  companyDid: string;
  assignedToDid?: string;
  islandId?: string;
  createdAt?: string;
  timestamp?: string;
  data?: any;
  cost?: number;
};

const UI_KEY = "trustup:creatorEventsKPI:ui";
const fmt = (n: number) => n.toFixed(3).replace(/\.?0+$/, "");

function toMsStart(d?: string) { return d ? new Date(`${d}T00:00:00`).getTime() : undefined; }
function toMsEnd(d?: string)   { return d ? new Date(`${d}T23:59:59.999`).getTime() : undefined; }

export default function CreatorEventsKPI() {
  const { currentUser } = useAuthStore();
  const companyDid = currentUser?.companyDid || currentUser?.did || "";

  // boot from query/localStorage
  const [booted, setBooted] = React.useState(false);
  const [type, setType] = React.useState<string>("all");
  const [islandId, setIslandId] = React.useState<string>("");
  const [assignee, setAssignee] = React.useState<string>("");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search || "");
      const saved = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
      const pick = (k: string, fb: string) => (params.get(k) ?? saved[k] ?? fb) as string;
      setType(pick("type", "all"));
      setIslandId(pick("islandId", ""));
      setAssignee(pick("assignee", ""));
      setFromDate(pick("from", ""));
      setToDate(pick("to", ""));
    } finally { setBooted(true); }
  }, []);

  // persist to query/localStorage
  React.useEffect(() => {
    if (!booted || typeof window === "undefined") return;
    const state = { type, islandId, assignee, from: fromDate, to: toDate };
    try { localStorage.setItem(UI_KEY, JSON.stringify(state)); } catch {}
    const p = new URLSearchParams();
    if (type !== "all") p.set("type", type);
    if (islandId) p.set("islandId", islandId);
    if (assignee) p.set("assignee", assignee);
    if (fromDate) p.set("from", fromDate);
    if (toDate) p.set("to", toDate);
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [booted, type, islandId, assignee, fromDate, toDate]);

  // load events (client-side, mock storage)
  const [events, setEvents] = React.useState<EventRec[]>([]);
  React.useEffect(() => {
    if (!companyDid) return;
    const list = listEvents({ companyDid }); // già ordinati
    setEvents(list as any);
  }, [companyDid]);

  // filter + derive KPI
  const filtered = React.useMemo(() => {
    const msFrom = toMsStart(fromDate);
    const msTo = toMsEnd(toDate);
    return events.filter((e) => {
      if (type !== "all" && e.type !== type) return false;
      if (islandId) {
        const isl = (e.islandId || e.data?.islandId || "");
        if (isl !== islandId) return false;
      }
      if (assignee) {
        const a = (e.assignedToDid || e.data?.assignedToDid || "");
        if (!a.toLowerCase().includes(assignee.toLowerCase())) return false;
      }
      const ts = e.createdAt || e.timestamp || "";
      const tms = ts ? new Date(ts).getTime() : 0;
      if (Number.isFinite(msFrom) && tms < (msFrom as number)) return false;
      if (Number.isFinite(msTo) && tms > (msTo as number)) return false;
      return true;
    });
  }, [events, type, islandId, assignee, fromDate, toDate]);

  const kpi = React.useMemo(() => {
    let total = 0;
    const byType: Record<string, { n: number; sum: number }> = {};
    const byIsland: Record<string, number> = {};
    for (const e of filtered) {
      const cost = Number.isFinite(e.cost as number) ? (e.cost as number) : Number(e.data?.billing?.cost || 0);
      if (cost > 0) {
        total += cost;
        byType[e.type] = byType[e.type] || { n: 0, sum: 0 };
        byType[e.type].n += 1;
        byType[e.type].sum += cost;
        const isl = e.islandId || e.data?.islandId || "";
        if (isl) byIsland[isl] = (byIsland[isl] || 0) + cost;
      }
    }
    const avgByType = Object.entries(byType).map(([k, v]) => [k, v.n ? v.sum / v.n : 0] as const);
    const topIslands = Object.entries(byIsland).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total, count: filtered.length, avgByType, topIslands };
  }, [filtered]);

  function goTimeline() {
    const p = new URLSearchParams();
    if (type !== "all") p.set("type", type);
    if (islandId) p.set("islandId", islandId);
    if (assignee) p.set("assignee", assignee);
    if (fromDate) p.set("from", fromDate);
    if (toDate) p.set("to", toDate);
    p.set("onlyCost", "1");
    window.location.href = "/creator/events/timeline" + (p.toString() ? `?${p.toString()}` : "");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Creator • KPI eventi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtri */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                {(Array.isArray(EVENT_TYPES) && EVENT_TYPES.length ? EVENT_TYPES : []).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input className="w-48" placeholder="Island ID" value={islandId} onChange={(e) => setIslandId(e.target.value)} />
            <Input className="w-56" placeholder="Assignee DID" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
            <div className="flex items-center gap-2">
              <Input type="date" className="w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <span className="text-xs text-muted-foreground">→</span>
              <Input type="date" className="w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <Button variant="outline" onClick={goTimeline}>Apri timeline</Button>
          </div>

          {/* KPI cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground text-sm"># Eventi</div>
              <div className="font-mono">{kpi.count}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground text-sm">Costo totale</div>
              <div className="font-mono">{fmt(kpi.total)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground text-sm">Costo medio (per tipo)</div>
              <ul className="text-xs mt-1 list-disc pl-4">
                {kpi.avgByType.length ? kpi.avgByType.map(([t, v]) => (
                  <li key={t}><span className="font-mono">{t}</span>: {fmt(v)}</li>
                )) : <li className="text-muted-foreground">—</li>}
              </ul>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="text-muted-foreground text-sm">Top isole per costo</div>
            <ul className="text-xs mt-1 list-disc pl-4">
              {kpi.topIslands.length ? kpi.topIslands.map(([k, v]) => (
                <li key={k}><span className="font-mono">{k}</span>: {fmt(v)}</li>
              )) : <li className="text-muted-foreground">—</li>}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
