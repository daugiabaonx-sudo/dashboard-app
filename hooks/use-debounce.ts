"use client";

// useDebounce — returns a debounced copy of `value` that only updates after
// `delayMs` of inactivity. Used by the table search bar so typing in the
// filter input doesn't re-render the table on every keystroke.

import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}