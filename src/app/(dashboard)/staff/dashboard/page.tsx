import type { Metadata } from "next";
import Link from "next/link";
import { SCHOOL } from "@/config/branding";
import { requireStaff } from "@/lib/dal";
import { getRequests, getITTickets } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import {
  FileText,
  LifeBuoy,
  PlusCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: `Staff Workspace | ${SCHOOL.shortName}`,
};

export default async function StaffDashboardPage() {
  const session = await requireStaff();

  const [myRequests, myTickets] = await Promise.all([
    getRequests({ requesterId: session.id }),
    getITTickets({ requesterId: session.id }),
  ]);

  const pendingRequests = myRequests.filter((r) => r.status === "submitted" || r.status === "under_review");
  const approvedRequests = myRequests.filter((r) => r.status === "approved" || r.status === "waiting_release");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Staff Portal & Requisitions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, <strong>{session.fullName}</strong>. Submit requisitions, request items, and report IT issues.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button render={<Link href="/requests/new" />} variant="default" size="sm">
            <PlusCircle className="size-4 mr-1" /> New Requisition
          </Button>
          <Button render={<Link href="/it/tickets" />} variant="outline" size="sm">
            <LifeBuoy className="size-4 mr-1 text-primary" /> IT Helpdesk
          </Button>
        </div>
      </div>


      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">My Requests</p>
              <p className="text-2xl font-bold mt-1 text-primary">{myRequests.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Items & expense requests</p>
            </div>
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Under Review</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{pendingRequests.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Awaiting management review</p>
            </div>
            <div className="p-2.5 rounded-full bg-amber-50 text-amber-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Approved</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{approvedRequests.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ready or pending disbursement</p>
            </div>
            <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">IT Tickets</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{myTickets.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Hardware & network tickets</p>
            </div>
            <div className="p-2.5 rounded-full bg-blue-50 text-blue-600">
              <LifeBuoy className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: My Requests & My IT Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests List */}
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">My Recent Requisitions</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Stationery, equipment, and departmental expenditures</p>
            </div>
            <Button render={<Link href="/requests" />} variant="ghost" size="sm" className="text-xs">
              View All <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {myRequests.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                You have not submitted any requisitions yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {myRequests.slice(0, 5).map((req) => (
                  <div key={req.id} className="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{req.title}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {req.category}
                        </Badge>
                        <Badge
                          variant={
                            req.status === "completed" || req.status === "released"
                              ? "default"
                              : req.status === "approved"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px] capitalize"
                        >
                          {req.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{req.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>Amount: <strong>GH₵ {formatCurrency(req.amount_requested)}</strong></span>
                        <span>Date: {new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button render={<Link href={`/requests?id=${req.id}`} />} variant="outline" size="xs">
                      Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* IT Tickets List */}
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">My IT Support Incidents</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Issues reported to the IT Officer</p>
            </div>
            <Button render={<Link href="/it/tickets" />} variant="ghost" size="sm" className="text-xs">
              View All <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {myTickets.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No active IT tickets logged.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {myTickets.slice(0, 5).map((ticket) => (
                  <div key={ticket.id} className="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{ticket.title}</p>
                        <Badge
                          variant={
                            ticket.status === "resolved"
                              ? "default"
                              : ticket.status === "in_progress"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px] capitalize"
                        >
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Category: {ticket.category} • {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button render={<Link href="/it/tickets" />} variant="outline" size="xs">
                      Status
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
