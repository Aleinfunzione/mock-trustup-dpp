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

function usePath() {
  const { pathname } = useLocation();
  const starts = (to: string) => pathname.startsWith(to);
  const exact = (to: string) => pathname === to;
  return { starts, exact };
}

function roleBaseOf(role?: string) {
  if (role === "company") return "/company";
  if (role === "creator") return "/creator";
  if (role === "admin") return "/admin";
  if (role === "operator") return "/operator";
  if (role === "machine") return "/machine";
  return "/creator";
}

export default function Sidebar() {
  const { currentUser } = useAuth();
  const role = currentUser?.role ?? "creator";
  const base = roleBaseOf(role);
  const { starts, exact } = usePath();

  // Admin/operator/machine: menu minimale
  if (role === "admin" || role === "operator" || role === "machine") {
    return (
      <UISidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={exact(base)}>
                    <NavLink to={base} end><span>Dashboard</span></NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {role === "admin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={starts(`${base}/credits`)}>
                        <NavLink to={`${base}/credits`}>Crediti</NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={exact(`${base}/credits/history`)}>
                        <NavLink to={`${base}/credits/history`}>Storico crediti</NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </UISidebar>
    );
  }

  const productsBase = `${base}/products`;

  return (
    <UISidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={exact(base)}>
                  <NavLink to={base} end><span>Dashboard</span></NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Prodotti */}
              <Collapsible defaultOpen={starts(productsBase)} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={starts(productsBase)}>
                      <span>Prodotti</span>
                      <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={exact(`${productsBase}/new`)}>
                          <NavLink to={`${productsBase}/new`}><span>Crea nuovo prodotto</span></NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={exact(productsBase)}>
                          <NavLink to={productsBase} end><span>Tutti i prodotti</span></NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={starts(`${productsBase}/credentials`)}>
                          <NavLink to={`${productsBase}/credentials`}><span>Credenziali</span></NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={exact(`${productsBase}/dpp`)}>
                          <NavLink to={`${productsBase}/dpp`}><span>DPP Viewer</span></NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Organizzazione (Company) */}
              {role === "company" && (
                <Collapsible
                  defaultOpen={
                    starts(`${base}/attributes`) || starts(`${base}/compliance`) ||
                    starts(`${base}/credentials`) || starts(`${base}/team`)
                  }
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={
                          starts(`${base}/attributes`) || starts(`${base}/compliance`) ||
                          starts(`${base}/credentials`) || starts(`${base}/team`)
                        }
                      >
                        <span>Organizzazione</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={starts(`${base}/attributes`)}>
                            <NavLink to={`${base}/attributes`}><span>Attributi azienda</span></NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={starts(`${base}/compliance`)}>
                            <NavLink to={`${base}/compliance`}><span>Compliance</span></NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={starts(`${base}/credentials`)}>
                            <NavLink to={`${base}/credentials`}><span>Credenziali org</span></NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={starts(`${base}/team`)}>
                            <NavLink to={`${base}/team`}><span>Team</span></NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* Crediti */}
              <Collapsible defaultOpen={starts(`${base}/credits`)} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={starts(`${base}/credits`)}>
                      <span>Crediti</span>
                      <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={exact(`${base}/credits`)}>
                          <NavLink to={`${base}/credits`} end><span>Saldo</span></NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={exact(`${base}/credits/history`)}>
                          <NavLink to={`${base}/credits/history`}><span>Storico crediti</span></NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </UISidebar>
  );
}
