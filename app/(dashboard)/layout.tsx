import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="px-0">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
