"use client";

import { logoutAction } from "@/lib/actions/auth";
import { Loader2, LogOut } from "lucide-react";
import { useTransition } from "react";

/**
 * Logout button — Client Component so it can show a pending state.
 * Calls logoutAction Server Action which signs out and redirects to /login.
 */
export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
    });
  }

  return (
    <button
      onClick={handleLogout}
      disabled={pending}
      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
      style={{ color: "var(--sidebar-muted)" }}
      onMouseEnter={(e) => {
        if (!pending) {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--sidebar-fg)";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "var(--sidebar-muted)";
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
      aria-label="Sign out"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4 flex-shrink-0" />
      )}
      {!collapsed && <span>{pending ? "Signing out…" : "Sign Out"}</span>}
    </button>
  );
}
