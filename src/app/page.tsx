import { redirect } from "next/navigation";

/**
 * Root page — redirect to the login screen.
 * Protected routes handled in (dashboard)/layout.tsx
 */
export default function RootPage() {
  redirect("/login");
}
