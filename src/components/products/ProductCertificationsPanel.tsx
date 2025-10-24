// src/components/products/ProductCertificationsPanel.tsx
import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getProductById, getAttachedOrgVCIds, attachOrgVC, detachOrgVC } from "@/services/api/products";
import { listVCs } from "@/services/api/vc";
import type { VC, VCStatus } from "@/types/vc";

type Props = {
  productId: string;
  onChanged?: (ids: string[]) => void;
};

export default function ProductCertificationsPanel({ productId, onChanged }: Props) {
  const [orgVCs, setOrgVCs] = React.useState<VC[]>([]);
  const [attached, setAttached] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const p = getProductById(productId) as any;
        const companyDid: string | undefined = p?.companyDid;

        const filters: any =
          companyDid
            ? { subjectType: "organization", subjectId: companyDid, status: "valid" as VCStatus }
            : { subjectType: "organization", status: "valid" as VCStatus };

        const list = (await listVCs(filters)) as VC[];
        const ids = new Set(getAttachedOrgVCIds(productId));

        if (!mounted) return;
        setOrgVCs(list);
        setAttached(ids);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Errore nel caricamento delle VC organizzative.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [productId]);

  function emitChange(next: Set<string>) {
    onChanged?.(Array.from(next));
  }

  function handleToggle(vcId: string, checked: boolean) {
    if (checked) {
      attachOrgVC(productId, vcId);
      const next = new Set(attached);
      next.add(vcId);
      setAttached(next);
      emitChange(next);
    } else {
      detachOrgVC(productId, vcId);
      const next = new Set(attached);
      next.delete(vcId);
      setAttached(next);
      emitChange(next);
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Caricamento…</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (orgVCs.length === 0) return <div className="text-sm text-muted-foreground">Nessuna VC organizzativa disponibile.</div>;

  return (
    <div className="grid gap-3">
      {orgVCs.map((vc) => {
        const isChecked = attached.has(vc.id);
        const title = (vc as any).title || vc.id;
        const standard = (vc as any).standardId || (vc as any).schemaId;
        const validFrom = (vc as any).validFrom;
        const validUntil = (vc as any).validUntil;

        return (
          <div key={vc.id} className="flex items-start gap-3 rounded border p-2">
            <Checkbox
              id={`vc_${vc.id}`}
              checked={isChecked}
              onCheckedChange={(c) => handleToggle(vc.id, !!c)}
            />
            <div className="flex-1 space-y-0.5">
              <Label htmlFor={`vc_${vc.id}`} className="font-medium">{title}</Label>
              <div className="text-xs text-muted-foreground">
                {standard ? <>Standard: {standard} · </> : null}
                {validFrom ? <>Valida da {validFrom}</> : null}
                {validUntil ? <> fino a {validUntil}</> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
