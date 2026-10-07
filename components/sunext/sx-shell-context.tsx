"use client";

// Shared state between the SUNEXT shell (topbar filters, toasts) and the
// page rendered inside it. The overview reads `filters`; any page can call
// `showToast` to get the template's toast style.

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CircleCheckBig, Sparkles, TriangleAlert, XCircle } from "lucide-react";
import type { SxFilters } from "@/lib/sx-dashboard";

export type SxToastType = "info" | "success" | "warning" | "error";

export interface SxShellContextValue {
  filters: SxFilters;
  showToast: (message: string, type?: SxToastType) => void;
  /** Mount point next to `.app` (where the template places its modal). */
  portalEl: HTMLElement | null;
  /** Owner / Admin / Manager may edit Planner tasks; others are read-only. */
  canEdit: boolean;
}

export const SxShellContext = createContext<SxShellContextValue | null>(null);

export function useSxShell(): SxShellContextValue {
  const value = useContext(SxShellContext);
  if (!value) throw new Error("useSxShell must be used inside <SxShell>");
  return value;
}

interface ToastItem {
  id: number;
  message: string;
  type: SxToastType;
  leaving: boolean;
}

const TOAST_VISIBLE_MS = 2800;
const TOAST_LEAVE_MS = 260;

/** Port of ui.js#showToast — visible 2.8s, then a 260ms leave animation. */
export function useSxToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, type: SxToastType = "info") => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, message, type, leaving: false }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_LEAVE_MS);
    }, TOAST_VISIBLE_MS);
  }, []);

  return { toasts, showToast };
}

const TOAST_ICONS = {
  info: Sparkles,
  success: CircleCheckBig,
  warning: TriangleAlert,
  error: XCircle,
} as const;

export function SxToastContainer({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="toast-container" id="toastContainer" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = TOAST_ICONS[t.type];
        return (
          <div key={t.id} className={t.leaving ? "toast leaving" : "toast"}>
            <div className="toast-icon">
              <Icon />
            </div>
            <div className="toast-text">{t.message}</div>
          </div>
        );
      })}
    </div>
  );
}
