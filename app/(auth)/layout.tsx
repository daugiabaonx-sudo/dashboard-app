// app/(auth)/layout.tsx
// Layout for unauthenticated routes. Owns the Toaster so login/signup
// get consistent sonner output.

import type { ReactNode } from "react";
import { Toaster } from "sonner";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
