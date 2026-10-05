"use client";

// Task modal provider + hook. Owns the currently-open task id and the
// imperative API the table uses to open a row's modal. The provider is
// mounted once at the (dashboard) layout; any descendant client component
// can call `useTaskModal()` to open/close.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface TaskModalContextValue {
  openTaskId: string | null;
  open: (taskId: string) => void;
  close: () => void;
}

const TaskModalContext = createContext<TaskModalContextValue | null>(null);

export function TaskModalProvider({ children }: { children: ReactNode }) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const open = useCallback((taskId: string) => {
    setOpenTaskId(taskId);
  }, []);

  const close = useCallback(() => {
    setOpenTaskId(null);
  }, []);

  const value = useMemo(
    () => ({ openTaskId, open, close }),
    [openTaskId, open, close],
  );

  return (
    <TaskModalContext.Provider value={value}>
      {children}
    </TaskModalContext.Provider>
  );
}

export function useTaskModal(): TaskModalContextValue {
  const ctx = useContext(TaskModalContext);
  if (!ctx) {
    throw new Error("useTaskModal must be used inside <TaskModalProvider>");
  }
  return ctx;
}