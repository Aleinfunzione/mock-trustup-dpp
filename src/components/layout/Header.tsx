// src/components/layout/Header.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { useAuth } from "@/hooks/useAuth";
import BackButton from "./BackButton";
import CreditsBadge from "@/components/credit/CreditsBadge";

function shortId(id?: string) {
  if (!id) return "";
  return id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}

export default function Header() {
  const { logout, currentUser } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const role = currentUser?.role as "creator" | "company" | "admin" | "operator" | "machine" | undefined;
  const base = role ? `/${role}` : "/";

  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; to?: string }[] = [{ label: "TRUSTUP", to: base }];

  if (parts.length >= 2 && parts[1] === "products") {
    crumbs.push({ label: "Prodotti", to: `${base}/products` });
    if (parts[2]) {
      const pid = parts[2];
      crumbs.push({ label: shortId(pid), to: `${base}/products/${pid}` });
      if (parts[3] === "attributes") crumbs.push({ label: "Caratteristiche" });
      if (parts[3] === "credentials") crumbs.push({ label: "Credenziali" });
      if (parts[3] === "dpp") crumbs.push({ label: "DPP" });
    }
  } else if (parts.length >= 2 && parts[1] === "events") {
    crumbs.push({ label: "Eventi", to: `${base}/events` });
  } else if (parts.length >= 2 && parts[1] === "attributes") {
    crumbs.push({ label: "Attributi azienda", to: `${base}/attributes` });
  } else if (parts.length >= 2 && parts[1] === "compliance") {
    crumbs.push({ label: "Compliance", to: `${base}/compliance` });
  } else if (parts.length >= 2 && parts[1] === "credentials") {
    crumbs.push({ label: "Credenziali org", to: `${base}/credentials` });
  }

  const showCrumbs = crumbs.length > 1;

  const userDid = currentUser?.did;
  const companyDid = currentUser?.companyDid;

  const actor =
    role && userDid
      ? {
          ownerType: role,
          ownerId: userDid,
          companyId: companyDid,
        }
      : undefined;

  return (
    <header
      className="
        h-14 sticky top-0 z-60
        bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80
        border-b
        px-4 flex items-center justify-between
      "
    >
      <div className="flex items-center gap-3 min-w-0">
        <BackButton fallbackTo={base} />
        {showCrumbs ? (
          <nav className="text-sm flex items-center gap-2 min-w-0" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-2 min-w-0">
                {i > 0 && <span className="text-muted-foreground">/</span>}
                {c.to ? (
                  <Link to={c.to} className="hover:underline truncate max-w-[18ch]" title={String(c.label)}>
                    {c.label}
                  </Link>
                ) : (
                  <span className="font-semibold truncate max-w-[24ch]">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <div className="font-semibold">TRUSTUP</div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Unico badge crediti: solo attore */}
        <CreditsBadge actor={actor} showCompany={false} showActor compact refreshMs={5000} />

        {/* DID utente e azienda */}
        {companyDid && (
          <span className="hidden sm:inline text-xs font-mono text-muted-foreground" title={`companyDid: ${companyDid}`}>
            org:{shortId(companyDid)}
          </span>
        )}
        {userDid && (
          <span className="hidden sm:inline text-xs font-mono text-muted-foreground" title={`did: ${userDid}`}>
            did:{shortId(userDid)}
          </span>
        )}

        <ModeToggle />
        <Button variant="outline" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
