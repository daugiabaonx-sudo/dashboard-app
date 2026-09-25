"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
          <span className="text-sm font-semibold tracking-tight">SUNEXT</span>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 animate-fade-in"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-card shadow-overlay animate-fade-in">
            <div className="flex h-14 items-center justify-end px-3 border-b border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X />
              </Button>
            </div>
            <div onClick={() => setOpen(false)}>
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
