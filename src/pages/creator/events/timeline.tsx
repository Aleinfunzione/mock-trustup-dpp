// src/pages/creator/events/timeline.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

const UI_KEY = "trustup:creatorEventsTimeline:ui";
const fmt = (n: number) => n.toFixed(3).replace(/\.?0+$/, "");
function toMsStart(d?: string) { return d ? new Date(`${d}T00:00:00`).getTime() : undefined; }
function toMsEnd(d?: string)   { return d ? new Date(`${d}T23:59:59.999`).getTime() : undefined; }

export default function CreatorEventsTimeline() {
  const { currentUser } = useAuthStore();
  const companyDid = currentUser?.companyDid || currentUser?.did || "";

  // boot from query/localStorage
  const [booted, setBooted] = React.useState(false);
  const [type, setType] = React.useState<string>("all");
  const [islandId, setIslandId] = React.useState<string>("");
  const [assignee, setAssignee] = React.useState<string>("");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [onlyCost, setOnlyCost] = React.useState<boolean>(false);

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
      setOnlyCost((params.get("onlyCost") ?? saved["onlyCost"] ?? "0") === "1");
    } finally { setBooted(true); }
  }, []);

  // persist to query + localStorage
  React.useEffect(() => {
    if (!booted || typeof window === "undefined") return;
    const state = { type, islandId, assignee, from: fromDate, to: toDate, onlyCost: onlyCost ? "1" : "0" };
    try { localStorage.setItem(UI_KEY, JSON.stringify(state)); } catch {}
    const p = new URLSearchParams();
    if (type !== "all") p.set("type", type);
    if (islandId) p.set("islandId", islandId);
    if (assignee) p.set("assignee", assignee);
    if (fromDate) p.set("from", fromDate);
    if (toDate) p.set("to", toDate);
    if (onlyCost) p.set("onlyCost", "1");
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [booted, type, islandId, assignee, fromDate, toDate, onlyCost]);

  // load + filter
  const [events, setEvents] = React.useState<EventRec[]>([]);
  React.useEffect(() => {
    if (!companyDid) return;
    setEvents(listEvents({ companyDid }) as any);
  }, [companyDid]);

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

      if (onlyCost) {
        const cost = Number.isFinite(e.cost as number) ? (e.cost as number) : Number(e.data?.billing?.cost || 0);
        if (!(cost > 0)) return false;
      }
      return true;
    });
  }, [events, type, islandId, assignee, fromDate, toDate, onlyCost]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creator • Timeline eventi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
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
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={onlyCost} onCheckedChange={(v) => setOnlyCost(!!v)} />
            Solo eventi con costo
          </label>
        </div>

        {/* Lista */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Quando</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Prodotto</th>
                <th className="py-2 pr-3">Assignee</th>
                <th className="py-2 pr-3">Isola</th>
                <th className="py-2 pr-3">Costo</th>
                <th className="py-2 pr-3">Payer</th>
                <th className="py-2 pr-3">Bucket</th>
                <th className="py-2 pr-3">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td className="py-4 text-muted-foreground" colSpan={9}>Nessun evento</td></tr>
              ) : filtered.slice().reverse().map((e) => {
                const cost = Number.isFinite(e.cost as number) ? (e.cost as number) : Number(e.data?.billing?.cost || 0);
                const payerType = e.data?.billing?.payerType || (e as any)?.meta?.payerType || "";
                const bucket = e.data?.billing?.islandBucketCharged ? "✓" : "";
                const ts = e.createdAt || e.timestamp || "";
                return (
                  <tr key={e.id} className="align-top">
                    <td className="py-1 pr-3 whitespace-nowrap">{ts}</td>
                    <td className="py-1 pr-3">{e.type}</td>
                    <td className="py-1 pr-3">{e.productId}</td>
                    <td className="py-1 pr-3">{e.assignedToDid || e.data?.assignedToDid || ""}</td>
                    <td className="py-1 pr-3">{e.islandId || e.data?.islandId || ""}</td>
                    <td className="py-1 pr-3">{cost ? fmt(cost) : ""}</td>
                    <td className="py-1 pr-3">{payerType}</td>
                    <td className="py-1 pr-3">{bucket}</td>
                    <td className="py-1 pr-3 font-mono text-xs">{e.id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
