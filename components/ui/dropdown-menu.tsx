// components/ui/dropdown-menu.tsx
// Lightweight wrapper around @radix-ui/react-dropdown-menu with project
// styling. Mirrors the shape of the Dialog wrapper: re-export primitives
// plus a styled Content/Item.

"use client";

import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuGroup = DropdownPrimitive.Group;
export const DropdownMenuPortal = DropdownPrimitive.Portal;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-md border border-border bg-card p-1 text-card-foreground shadow-overlay",
          "animate-fade-up",
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

interface DropdownMenuItemProps
  extends ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> {
  inset?: boolean;
  active?: boolean;
}

export function DropdownMenuItem({
  className,
  inset,
  active,
  children,
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        "focus:bg-muted focus:text-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        className,
      )}
      {...props}
    >
      {active ? <Check className="size-3.5 text-brand" /> : <span className="size-3.5" aria-hidden />}
      <span className="flex-1">{children}</span>
    </DropdownPrimitive.Item>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>) {
  return (
    <DropdownPrimitive.Label
      className={cn(
        "px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>) {
  return (
    <DropdownPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}