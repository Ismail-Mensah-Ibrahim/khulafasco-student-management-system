import type { Metadata } from "next";
import type { ReactNode } from "react";
import { verifySession } from "@/lib/dal";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Protected dashboard layout.
 *
 * verifySession() is the authoritative server-side auth gate —
 * unauthenticated users are redirected to /login before any JSX renders.
 *
 * AuthProvider makes the session available to Client Components without
 * prop drilling. The session data comes from the server — it is not
 * reconstructed from cookies on the client.
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await verifySession();

  return (
    <AuthProvider user={session}>
      <Toaster />
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
        <Sidebar
          userRole={session.role}
          userName={session.fullName}
          userEmail={session.email}
          houseResponsibility={session.houseResponsibility}
          additionalRoles={session.additionalRoles}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar
            userRole={session.role}
            userName={session.fullName}
            userEmail={session.email}
            houseResponsibility={session.houseResponsibility}
            additionalRoles={session.additionalRoles}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
