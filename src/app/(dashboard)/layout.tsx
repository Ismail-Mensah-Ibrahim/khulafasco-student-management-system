import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard layout — wraps all protected routes with sidebar + topbar.
 * Auth protection will be added in Milestone 2 (Supabase session check).
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      {/* Desktop sidebar */}
      <Sidebar userRole="admin" userName="Admin User" userEmail="admin@khulafasco.edu.gh" />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          userRole="admin"
          userName="Admin User"
          userEmail="admin@khulafasco.edu.gh"
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
