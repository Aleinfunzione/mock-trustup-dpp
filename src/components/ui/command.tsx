"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import * as CommandPrimitive from "cmdk";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Command>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Command>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Command
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
));
Command.displayName = "Command";

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.CommandInput>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.CommandInput>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3">
    <CommandPrimitive.CommandInput
      ref={ref}
      className={cn("flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground", className)}
      {...props}
    />
  </div>
));
CommandInput.displayName = "CommandInput";

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.CommandList>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.CommandList>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.CommandList ref={ref} className={cn("max-h-64 overflow-y-auto", className)} {...props} />
));
CommandList.displayName = "CommandList";

const CommandEmpty = CommandPrimitive.CommandEmpty;
const CommandGroup = CommandPrimitive.CommandGroup;
const CommandItem = CommandPrimitive.CommandItem;
const CommandSeparator = CommandPrimitive.CommandSeparator;

export { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator };
