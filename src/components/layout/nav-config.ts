import type { Role } from "@/types/auth";
import { ROUTES } from "@/utils/constants";

export type NavItem = { to: string; label: string };

/**
 * Voci di menu mostrate in sidebar in base al ruolo corrente.
 * Quando aggiungeremo nuove sezioni (Prodotti, Eventi, VC…), basterà
 * aggiungerle qui per farle apparire automaticamente.
 */
export const NAV: Record<Role, NavItem[]> = {
  // ADMIN: solo gestione aziende (al momento)
  admin: [
    { to: ROUTES.admin, label: "Aziende" },
    // { to: "/admin/credits", label: "Crediti" }, // quando pronto
  ],

  // COMPANY: Home (riepilogo) + Prodotti + Team + Eventi + Attributi
  company: [
    { to: ROUTES.company, label: "Home" },
    { to: "/company/products", label: "Prodotti" },
    { to: ROUTES.companyTeam, label: "Team" },
    { to: "/company/events", label: "Eventi" },       // NEW
    { to: "/company/attributes", label: "Attributi" } // NEW
    // Futuro:
    // { to: "/company/credentials", label: "DPP / VC" },
    // { to: "/company/credits", label: "Crediti EPR" },
  ],

  // CREATOR: Dashboard + Prodotti + Eventi
  creator: [
    { to: ROUTES.creator, label: "Dashboard" },
    { to: "/creator/products", label: "Prodotti" },
    { to: "/creator/events", label: "Eventi" }, // NEW
  ],

  // OPERATOR
  operator: [{ to: ROUTES.operator, label: "Operatore" }],

  // MACHINE
  machine: [{ to: ROUTES.machine, label: "Macchinario" }],
};
