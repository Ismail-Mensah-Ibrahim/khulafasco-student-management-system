"use client";

import { Bell, Search, ChevronDown } from "lucide-react";
import { SchoolLogo } from "@/components/branding/SchoolLogo";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getInitials } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface TopBarProps {
  userRole?: "admin" | "finance_officer";
  userName?: string;
  userEmail?: string;
  pageTitle?: string;
}

/**
 * Top navigation bar.
 * Shows user avatar + role, dropdown with logout, mobile hamburger + logo.
 */
export function TopBar({
  userRole = "admin",
  userName = "Staff User",
  userEmail = "",
  pageTitle,
}: TopBarProps) {
  const initials = getInitials(userName);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

      <div className="flex-1" />

      {/* Quick Search (desktop) */}
      <form
        action="/students"
        method="get"
        className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-all"
        style={{
          border: "1px solid var(--border)",
          background: "var(--muted)",
          minWidth: 240,
        }}
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--muted-foreground)" }} />
        <input
          type="text"
          name="search"
          placeholder="Quick student search..."
          className="bg-transparent text-xs w-full outline-none"
          style={{ color: "var(--foreground)" }}
          aria-label="Quick student search"
        />
      </form>

      {/* Notifications */}
      <button
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: "var(--muted-foreground)" }}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
      </button>

      {/* User dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 transition-colors"
          style={{ outline: "none" }}
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          aria-label="User menu"
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{
              background: "var(--brand-primary)",
              color: "var(--brand-primary-foreground)",
            }}
          >
            {initials}
          </div>

          {/* Name + role (desktop only) */}
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
              {userName}
            </p>
            <p className="text-xs leading-tight" style={{ color: "var(--muted-foreground)" }}>
              {userRole === "admin" ? "Administrator" : "Finance Officer"}
            </p>
          </div>

          <ChevronDown
            className="w-3.5 h-3.5 hidden md:block transition-transform"
            style={{
              color: "var(--muted-foreground)",
              transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 w-56 rounded-xl py-1.5 z-50"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}
            role="menu"
          >
            {/* User info header */}
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
                {userName}
              </p>
              {userEmail && (
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {userEmail}
                </p>
              )}
              <span
                className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: "var(--brand-accent)",
                  color: "var(--brand-primary)",
                }}
              >
                {userRole === "admin" ? "Administrator" : "Finance Officer"}
              </span>
            </div>

            {/* Logout */}
            <div className="px-2 pt-1.5">
              <LogoutButton />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
