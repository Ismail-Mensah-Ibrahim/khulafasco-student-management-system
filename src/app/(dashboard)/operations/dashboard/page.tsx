import type { Metadata } from "next";
import Link from "next/link";
import { SCHOOL } from "@/config/branding";
import { requireDomesticOfficer } from "@/lib/dal";
import { getRequests } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import {
  Truck,
  Package,
  Clock,
  CheckCircle2,
  DollarSign,
  PlusCircle,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: `Operations & Logistics | ${SCHOOL.shortName}`,
};

export default async function OperationsDashboardPage() {
  const session = await requireDomesticOfficer();
  const requests = await getRequests({ requesterId: session.id });

  const pending = requests.filter((r) => r.status === "submitted" || r.status === "under_review");
  const approvedWaiting = requests.filter((r) => r.status === "approved" || r.status === "waiting_release");
  const completed = requests.filter((r) => r.status === "completed" || r.status === "released");

  const totalDisbursed = completed.reduce((acc, r) => acc + (r.amount_released || r.amount_requested || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Domestic & Logistics Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Logged in as <strong>{session.fullName}</strong>. Food supplies, facility maintenance, sanitation, and vehicle logistics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/requests/new" />} variant="default" size="sm">
            <PlusCircle className="size-4 mr-1" /> New Requisition
          </Button>
          <Button render={<Link href="/requests" />} variant="outline" size="sm">
            <FileText className="size-4 mr-1 text-primary" /> Track My Requests
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Total Requisitions</p>
              <p className="text-2xl font-bold mt-1 text-primary">{requests.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Supplies & maintenance orders</p>
            </div>
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <Package className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Pending Approval</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{pending.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Awaiting Headmaster sign-off</p>
            </div>
            <div className="p-2.5 rounded-full bg-amber-50 text-amber-600">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Waiting Release</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{approvedWaiting.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Approved by Head, at Finance</p>
            </div>
            <div className="p-2.5 rounded-full bg-blue-50 text-blue-600">
              <DollarSign className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Fulfilled</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{completed.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">GH₵ {formatCurrency(totalDisbursed)} released</p>
            </div>
            <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logistics Categories & Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders List */}
        <div className="lg:col-span-2">
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Active Logistics Requisitions</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Track procurement status from approval to financial disbursement</p>
              </div>
              <Button render={<Link href="/requests" />} variant="ghost" size="sm" className="text-xs">
                View All <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {requests.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No active logistics requisitions found. Click &quot;New Requisition&quot; to submit.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {requests.slice(0, 5).map((req) => (
                    <div key={req.id} className="py-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
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
                                : req.status === "approved" || req.status === "waiting_release"
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
                          <span>Submitted: {new Date(req.created_at).toLocaleDateString()}</span>
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
        </div>

        {/* Operational Scope & Quick Links */}
        <div className="space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Truck className="size-4 text-primary" />
                Operational Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5">
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <p className="font-semibold text-xs text-foreground">Food & Dining Hall Supplies</p>
                <p className="text-[11px] text-muted-foreground">Kitchen groceries, gas refills, and pantry staples.</p>
              </div>
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <p className="font-semibold text-xs text-foreground">Estate & Facility Maintenance</p>
                <p className="text-[11px] text-muted-foreground">Electrical repairs, carpentry, plumbing, and painting.</p>
              </div>
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <p className="font-semibold text-xs text-foreground">Sanitation & Hygiene Products</p>
                <p className="text-[11px] text-muted-foreground">Cleaning detergents, brooms, disinfectants, and washrooms.</p>
              </div>
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                <p className="font-semibold text-xs text-foreground">SickBay & Medical Supplies</p>
                <p className="text-[11px] text-muted-foreground">First-aid restocking, bandages, OTC medications, and cotton.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
