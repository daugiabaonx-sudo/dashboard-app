"use client";

// Debounced search input for the Animated Tasks table. The parent owns the
// "live" value; this component fires an `onChange` (debounced) so URL state
// and the row filter only update after the user pauses typing.

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/cn";

interface TableSearchProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  countLabel: string;
  className?: string;
  delayMs?: number;
}

export function TableSearch({
  value,
  onChange,
  placeholder,
  countLabel,
  className,
  delayMs = 200,
}: TableSearchProps) {
  const [local, setLocal] = useState(value);
  const debounced = useDebounce(local, delayMs);

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
  }, [debounced, onChange, value]);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <span className="sr-only" id="table-search-label">
        {placeholder}
      </span>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground/70"
      />
      <Input
        type="search"
        aria-labelledby="table-search-label"
        aria-describedby="table-search-count"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full pl-8 pr-7 text-[12.5px]"
      />
      {local ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setLocal("")}
          className="absolute right-2 inline-flex size-4 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      ) : null}
      <span
        id="table-search-count"
        aria-live="polite"
        className="hidden text-[11px] text-muted-foreground sm:inline"
      >
        {countLabel}
      </span>
    </div>
  );
}
