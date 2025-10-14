// src/components/ui/sidebar.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type WithAsChild<T> = T & { asChild?: boolean; isActive?: boolean };

export const Sidebar = React.forwardRef<HTMLDivElement, React.ComponentProps<"aside">>(
  ({ className, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn("bg-sidebar text-sidebar-foreground", className)}
      {...props}
    />
  )
);
Sidebar.displayName = "Sidebar";

export const SidebarContent = (p: React.ComponentProps<"div">) => (
  <div className={cn("flex-1 overflow-y-auto", p.className)} {...p} />
);

export const SidebarGroup = (p: React.ComponentProps<"div">) => (
  <div className={cn("px-3 py-3", p.className)} {...p} />
);

export const SidebarGroupContent = (p: React.ComponentProps<"div">) => (
  <div className={cn("space-y-1", p.className)} {...p} />
);

export const SidebarMenu = (p: React.ComponentProps<"ul">) => (
  <ul className={cn("space-y-1", p.className)} {...p} />
);

export const SidebarMenuItem = (p: React.ComponentProps<"li">) => <li {...p} />;

const baseBtn = [
  "inline-flex h-9 w-full items-center gap-2 rounded-xl px-3 text-sm",
  "transition-colors bg-transparent text-foreground hover:bg-muted",
  // niente outline/ring visivo che deforma
  "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0",
].join(" ");

const activeBtn = "bg-primary/10 text-primary font-medium";

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  WithAsChild<React.ComponentProps<"button">>
>(({ asChild, isActive, className, children, ...props }, ref) => {
  const Comp: any = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      className={cn(baseBtn, isActive && activeBtn, className)}
      aria-current={isActive ? "page" : undefined}
      style={{ WebkitTapHighlightColor: "transparent" }}
      {...props}
    >
      {children}
    </Comp>
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarMenuSub = (p: React.ComponentProps<"ul">) => (
  <ul className={cn("ml-5 space-y-1", p.className)} {...p} />
);

export const SidebarMenuSubItem = (p: React.ComponentProps<"li">) => <li {...p} />;

const subBtn = [
  "inline-flex h-8 w-full items-center gap-2 rounded-lg px-3 text-sm",
  "transition-colors bg-transparent hover:bg-muted",
  "outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0",
].join(" ");

const subActive = "bg-primary/10 text-primary font-medium";

export const SidebarMenuSubButton = React.forwardRef<
  HTMLButtonElement,
  WithAsChild<React.ComponentProps<"button">>
>(({ asChild, isActive, className, children, ...props }, ref) => {
  const Comp: any = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      className={cn(subBtn, isActive && subActive, className)}
      aria-current={isActive ? "page" : undefined}
      style={{ WebkitTapHighlightColor: "transparent" }}
      {...props}
    >
      {children}
    </Comp>
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

export const SidebarRail = () => null;
