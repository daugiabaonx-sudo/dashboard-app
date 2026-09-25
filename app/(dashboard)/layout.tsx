import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <MobileSidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="px-4 py-6 lg:px-8 lg:py-8 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
