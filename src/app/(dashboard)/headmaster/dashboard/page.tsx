import type { Metadata } from "next";
import Link from "next/link";
import { SCHOOL } from "@/config/branding";
import { requireRole } from "@/lib/dal";
import {
  getDashboardSummary,
  getFinanceDashboardMetrics,
  getRequests,
} from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  GraduationCap,
  ClipboardList,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: `Executive Dashboard | ${SCHOOL.shortName}`,
};

export default async function HeadmasterDashboardPage() {
  const session = await requireRole(["headmaster", "assistant_headmaster", "admin"]);

  const [summary, finance, pendingRequests] = await Promise.all([
    getDashboardSummary(),
    getFinanceDashboardMetrics(),
    getRequests({ status: "submitted" }),
  ]);

  const underReviewRequests = await getRequests({ status: "under_review" });
  const allActionableRequests = [...pendingRequests, ...underReviewRequests];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Headmaster Executive Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome, <strong>{session.fullName}</strong>. Institutional metrics, financial health, and governance approvals.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button render={<Link href="/requests" />} variant="default" size="sm">
            <FileText className="size-4 mr-1" /> Review Requests ({allActionableRequests.length})
          </Button>
          <Button render={<Link href="/admin/audit-logs" />} variant="outline" size="sm">
            <ClipboardList className="size-4 mr-1 text-primary" /> Audit Trail
          </Button>
        </div>
      </div>


      {/* Primary Institutional KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Total Enrollment</p>
              <p className="text-2xl font-bold mt-1 text-primary">{summary.totalStudents}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{summary.activeStudents} active students</p>
            </div>
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Fees Collected</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">GH₵ {formatCurrency(finance.totalCollected)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{finance.fullyPaid} students fully paid</p>
            </div>
            <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Outstanding Arrears</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">GH₵ {formatCurrency(finance.outstandingBalance)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{finance.unpaid} unpaid accounts</p>
            </div>
            <div className="p-2.5 rounded-full bg-amber-50 text-amber-600">
              <AlertCircle className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Pending Approvals</p>
              <p className="text-2xl font-bold mt-1 text-rose-600">{allActionableRequests.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Awaiting Headmaster sign-off</p>
            </div>
            <div className="p-2.5 rounded-full bg-rose-50 text-rose-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Pending Approval Requests & Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Approvals Queue */}
        <div className="lg:col-span-2">
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Institutional Requests Requiring Review</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Faculty, Departmental, and Logistics requests awaiting executive approval</p>
              </div>
              <Button render={<Link href="/requests" />} variant="ghost" size="sm" className="text-xs">
                View All <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {allActionableRequests.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="size-10 text-emerald-500/60 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">No requests waiting for review</p>
                  <p className="text-xs text-muted-foreground mt-1">All departmental and logistics requisitions have been processed.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {allActionableRequests.slice(0, 5).map((req) => (
                    <div key={req.id} className="py-3.5 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{req.title}</p>
                          <Badge variant="outline" className="text-[11px] capitalize">
                            {req.category}
                          </Badge>
                          <Badge variant="secondary" className="text-[11px] capitalize">
                            {req.request_type}
                          </Badge>
                          {req.priority === "urgent" && (
                            <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{req.description}</p>
                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-1.5">
                          <span>Requester: <strong>{req.requester?.full_name ?? "Staff"}</strong></span>
                          <span>Requested: <strong>GH₵ {formatCurrency(req.amount_requested)}</strong></span>
                          <span>Date: {new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button render={<Link href={`/requests?id=${req.id}`} />} variant="default" size="xs" className="shrink-0 mt-1">
                        Review & Sign
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* School Summary & Quick Links */}
        <div className="space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <GraduationCap className="size-4 text-primary" />
                Enrollment Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Boarding Students</span>
                <span className="font-semibold text-foreground">{summary.boardingStudents}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Day Students</span>
                <span className="font-semibold text-foreground">{summary.dayStudents}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Male Students</span>
                <span className="font-semibold text-foreground">{summary.maleStudents}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Female Students</span>
                <span className="font-semibold text-foreground">{summary.femaleStudents}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="size-4 text-primary" />
                Financial Collection Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Total Invoiced</span>
                <span className="font-bold text-foreground">GH₵ {formatCurrency(finance.amountDue)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all"
                  style={{
                    width: `${finance.amountDue > 0 ? Math.min(100, Math.round((finance.totalCollected / finance.amountDue) * 100)) : 0}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-right">
                {finance.amountDue > 0 ? Math.round((finance.totalCollected / finance.amountDue) * 100) : 0}% of expected fees collected
              </p>
              <div className="pt-2">
                <Button render={<Link href="/finance" />} variant="outline" size="sm" className="w-full text-xs">
                  Open Comprehensive Financial Audit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
