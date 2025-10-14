// src/components/layout/Sidebar.tsx
import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

type NavItem = { to: string; label: string; children?: NavItem[] };

const NAV: Record<string, NavItem[]> = {
  admin: [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/credits", label: "Crediti" },
    { to: "/admin/credits/history", label: "Storico crediti" },
  ],
  company: [
    { to: "/company", label: "Dashboard" },
    { to: "/company/products", label: "Prodotti" },
    { to: "/company/events", label: "Eventi" }, // nessun sottomenu per ora
    { to: "/company/org", label: "Organizzazione" },
    { to: "/company/attributes", label: "Attributi azienda" },
    { to: "/company/compliance", label: "Compliance" },
    { to: "/company/credentials", label: "Credenziali org" },
    { to: "/company/credits", label: "Crediti" },
    { to: "/company/credits/history", label: "Storico crediti" },
  ],
  creator: [
    { to: "/creator", label: "Dashboard" },
    { to: "/creator/products", label: "Prodotti" },
    {
      to: "/creator/events",
      label: "Eventi",
      children: [
        { to: "/creator/events", label: "KPI" },
        { to: "/creator/events/create", label: "Registra evento" },
        { to: "/creator/events/timeline", label: "Timeline" },
      ],
    },
    { to: "/creator/attributes", label: "Catalogo attributi" },
    {
      to: "/creator/credits",
      label: "Crediti",
      children: [{ to: "/creator/credits/history", label: "Storico crediti" }],
    },
  ],
  operator: [{ to: "/operator", label: "Dashboard" }],
  machine: [{ to: "/machine", label: "Dashboard" }],
};

export default function Sidebar() {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const role = currentUser?.role ?? "creator";
  const items = NAV[role] ?? [];

  const isExact = (to: string) => pathname === to;
  const isGroupActive = (it: NavItem) => isExact(it.to) || (it.children ?? []).some((c) => isExact(c.to));

  return (
    <UISidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((i) => {
                const hasChildren = !!i.children?.length;

                if (!hasChildren) {
                  return (
                    <SidebarMenuItem key={i.to}>
                      <SidebarMenuButton asChild isActive={isExact(i.to)}>
                        <NavLink to={i.to} end>
                          <span>{i.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <Collapsible
                    key={i.to}
                    defaultOpen={isGroupActive(i)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <span>{i.label}</span>
                          <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {i.children!.map((c) => (
                            <SidebarMenuSubItem key={c.to}>
                              <SidebarMenuSubButton asChild isActive={isExact(c.to)}>
                                <NavLink to={c.to} end>
                                  <span>{c.label}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </UISidebar>
  );
}
