// src/components/products/ProductCertificationsPanel.tsx
import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getProductById, getAttachedOrgVCIds, attachOrgVC, detachOrgVC } from "@/services/api/products";
import { listOrganizationVC, type OrgVC } from "@/services/api/vc";

type Props = {
  productId: string;
  onChanged?: (ids: string[]) => void;
};

export default function ProductCertificationsPanel({ productId, onChanged }: Props) {
  const [orgVCs, setOrgVCs] = React.useState<OrgVC[]>([]);
  const [attached, setAttached] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const p = getProductById(productId) as any;
        const companyDid: string | undefined = p?.companyDid;
        const list = companyDid ? listOrganizationVC(companyDid) : [];
        const ids = new Set(getAttachedOrgVCIds(productId));
        if (!mounted) return;
        setOrgVCs(list);
        setAttached(ids);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [productId]);

  async function toggle(vcId: string, checked: boolean) {
    if (checked) {
      attachOrgVC(productId, vcId);
      const next = new Set(attached); next.add(vcId);
      setAttached(next);
      onChanged?.(Array.from(next));
    } else {
      detachOrgVC(productId, vcId);
      const next = new Set(attached); next.delete(vcId);
      setAttached(next);
      onChanged?.(Array.from(next));
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Caricamento…</div>;
  if (orgVCs.length === 0) return <div className="text-sm text-muted-foreground">Nessuna VC organizzativa disponibile.</div>;

  return (
    <div className="grid gap-3">
      {orgVCs.map((vc) => {
        const isChecked = attached.has(vc.id);
        return (
          <div key={vc.id} className="flex items-start gap-3 rounded border p-2">
            <Checkbox
              id={`vc_${vc.id}`}
              checked={isChecked}
              onCheckedChange={(c) => toggle(vc.id, !!c)}
            />
            <div className="flex-1 space-y-0.5">
              <Label htmlFor={`vc_${vc.id}`} className="font-medium">{vc.title || vc.id}</Label>
              <div className="text-xs text-muted-foreground">
                {vc.standardId ? <>Standard: {vc.standardId} · </> : null}
                {vc.validFrom ? <>Valida da {vc.validFrom}</> : null}
                {vc.validUntil ? <> fino a {vc.validUntil}</> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
