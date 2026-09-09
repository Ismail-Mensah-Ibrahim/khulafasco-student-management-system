"use client";

import { Bell, Search, ChevronDown } from "lucide-react";
import { SchoolLogo } from "@/components/branding/SchoolLogo";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { getInitials } from "@/lib/utils";

interface TopBarProps {
  userRole?: "admin" | "finance_officer";
  userName?: string;
  userEmail?: string;
  pageTitle?: string;
}

/**
 * Top navigation bar — user info, page title, notifications.
 * Desktop: logo hidden (visible in sidebar). Mobile: shows hamburger + logo.
 */
export function TopBar({
  userRole = "admin",
  userName = "Staff User",
  pageTitle,
}: Omit<TopBarProps, "userEmail"> & { userEmail?: string }) {
  const initials = getInitials(userName);

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-4 px-4 h-14 flex-shrink-0"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Mobile: hamburger + logo */}
      <div className="flex items-center gap-3 md:hidden">
        <MobileSidebar userRole={userRole} userName={userName} />
        <SchoolLogo size="sm" showName />
      </div>

      {/* Desktop: page title */}
      {pageTitle && (
        <h1
          className="hidden md:block text-base font-semibold truncate"
          style={{ color: "var(--foreground)" }}
        >
          {pageTitle}
        </h1>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search (desktop) */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
        style={{
          border: "1px solid var(--border)",
          background: "var(--muted)",
          color: "var(--muted-foreground)",
          minWidth: 200,
        }}
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Search students…</span>
      </div>

      {/* Notifications */}
      <button
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: "var(--muted-foreground)" }}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
      </button>

      {/* User avatar + role */}
      <div className="flex items-center gap-2 cursor-pointer">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{
            background: "var(--brand-primary)",
            color: "var(--brand-primary-foreground)",
          }}
          aria-label={userName}
        >
          {initials}
        </div>

        {/* Name + role (desktop only) */}
        <div className="hidden md:block text-right">
          <p className="text-xs font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
            {userName}
          </p>
          <p className="text-xs leading-tight" style={{ color: "var(--muted-foreground)" }}>
            {userRole === "admin" ? "Administrator" : "Finance Officer"}
          </p>
        </div>

        <ChevronDown className="w-3.5 h-3.5 hidden md:block" style={{ color: "var(--muted-foreground)" }} />
      </div>
    </header>
  );
}
