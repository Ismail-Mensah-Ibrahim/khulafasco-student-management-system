import type { Metadata } from "next";
import Link from "next/link";
import { SCHOOL } from "@/config/branding";
import { requireITOfficer } from "@/lib/dal";
import { getITTickets, getRequests } from "@/lib/data";
import {
  LifeBuoy,
  Activity,
  CheckCircle2,
  Clock,
  Server,
  Database,
  ShieldAlert,
  ArrowRight,
  PlusCircle,
  KeyRound,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: `IT Dashboard | ${SCHOOL.shortName}`,
};

export default async function ITDashboardPage() {
  const session = await requireITOfficer();
  const tickets = await getITTickets();
  const userRequests = await getRequests({ requesterId: session.id });

  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "acknowledged");
  const inProgressTickets = tickets.filter((t) => t.status === "in_progress");
  const resolvedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed");

  const recentTickets = tickets.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            IT Operations & Infrastructure
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Logged in as <strong>{session.fullName}</strong>. System status, ticketing triage, and account management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/it/tickets" />} variant="outline" size="sm">
            <LifeBuoy className="size-4 mr-1 text-primary" /> View All Tickets
          </Button>
          <Button render={<Link href="/requests/new" />} size="sm">
            <PlusCircle className="size-4 mr-1" /> New IT Request
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Open Tickets</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{openTickets.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Awaiting triage / assignment</p>
            </div>
            <div className="p-2.5 rounded-full bg-amber-50 text-amber-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">In Progress</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{inProgressTickets.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Currently being addressed</p>
            </div>
            <div className="p-2.5 rounded-full bg-blue-50 text-blue-600">
              <Activity className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Resolved</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{resolvedTickets.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total issues resolved</p>
            </div>
            <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">My IT Requests</p>
              <p className="text-2xl font-bold mt-1 text-primary">{userRequests.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Supplies & lab hardware</p>
            </div>
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <Server className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Section */}
      <div id="health" className="scroll-mt-6">
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="size-4 text-emerald-600" />
                System & Infrastructure Health
              </CardTitle>
              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                All Systems Operational
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 flex items-start gap-3">
              <Database className="size-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">PostgreSQL (Supabase)</p>
                <p className="text-xs text-muted-foreground">Region: uscveouabdtcyxlitiyo</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Connected & Healthy
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 flex items-start gap-3">
              <Server className="size-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Next.js Edge & App Server</p>
                <p className="text-xs text-muted-foreground">Version: Next.js 16.3.4 (Vercel)</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> 100% Uptime
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 flex items-start gap-3">
              <ShieldAlert className="size-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Row-Level Security (RLS)</p>
                <p className="text-xs text-muted-foreground">8 Staff Roles Enforced</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium">
                  <CheckCircle2 className="size-3.5 text-primary" /> Multi-Tenant Shield Active
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Recent Tickets & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Triage Queue */}
        <div className="lg:col-span-2">
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent Helpdesk Tickets</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Latest support submissions from faculty and staff</p>
              </div>
              <Button render={<Link href="/it/tickets" />} variant="ghost" size="sm" className="text-xs">
                View All <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {recentTickets.length === 0 ? (
                <div className="py-12 text-center">
                  <LifeBuoy className="size-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No open tickets at this time</p>
                  <p className="text-xs text-muted-foreground mt-1">Faculty and staff tickets will appear here for resolution.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentTickets.map((ticket) => (
                    <div key={ticket.id} className="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{ticket.title}</p>
                          <Badge
                            variant={
                              ticket.status === "open"
                                ? "destructive"
                                : ticket.status === "in_progress"
                                ? "default"
                                : "outline"
                            }
                            className="text-[11px] capitalize"
                          >
                            {ticket.status.replace("_", " ")}
                          </Badge>
                          {ticket.priority === "urgent" && (
                            <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
                          <span>From: <strong>{ticket.requester?.full_name ?? "Staff"}</strong></span>
                          {ticket.location && <span>Location: {ticket.location}</span>}
                          <span>Category: {ticket.category}</span>
                        </div>
                      </div>
                      <Button render={<Link href="/it/tickets" />} variant="outline" size="xs" className="shrink-0 mt-1">
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick IT Actions Panel */}
        <div className="space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                Staff Support Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="p-3 rounded-lg border border-border bg-card">
                <p className="text-xs font-semibold text-foreground">Password Reset Dispatch</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">
                  Send a self-service password reset email to a staff member.
                </p>
                <Button render={<Link href="/it/tickets#reset" />} variant="outline" size="sm" className="w-full text-xs">
                  Go to Password Reset
                </Button>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card">
                <p className="text-xs font-semibold text-foreground">Staff User Management</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">
                  Review staff accounts, roles, and active authentication state.
                </p>
                <Button render={<Link href="/admin/staff" />} variant="outline" size="sm" className="w-full text-xs">
                  Manage Staff Directory
                </Button>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card">
                <p className="text-xs font-semibold text-foreground">System Audit Logs</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">
                  Inspect authentication, financial, and administrative operations.
                </p>
                <Button render={<Link href="/admin/audit-logs" />} variant="outline" size="sm" className="w-full text-xs">
                  View Security Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
