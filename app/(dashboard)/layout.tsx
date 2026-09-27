import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { Header } from "@/components/layout/header";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Sidebar } from "@/components/layout/sidebar";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64">
        <Sidebar />
      </div>
      <div className="lg:pl-64">
        <MobileSidebar />
        <Header />
        <main className="px-4 pb-6 pt-[132px] lg:px-8 lg:pb-8 lg:pt-8 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
