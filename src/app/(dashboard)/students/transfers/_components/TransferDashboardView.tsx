"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Search,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentTransfer } from "@/types";
import type { TransferMetrics } from "@/lib/data";

interface TransferDashboardViewProps {
  transfers: StudentTransfer[];
  metrics: TransferMetrics;
}

export function TransferDashboardView({
  transfers,
  metrics,
}: TransferDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "in" | "out" | "pending" | "completed">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTransfers = transfers.filter((t) => {
    // Filter by tab
    if (activeTab === "in" && t.direction !== "transfer_in") return false;
    if (activeTab === "out" && t.direction !== "transfer_out") return false;
    if (activeTab === "pending" && !["submitted", "under_review", "academic_verification", "academic_clearance", "finance_clearance"].includes(t.status)) {
      return false;
    }
    if (activeTab === "completed" && !["approved", "enrolled", "completed"].includes(t.status)) {
      return false;
    }

    // Filter by search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchRef = t.transfer_reference?.toLowerCase().includes(q);
      const matchIndex = t.jhs_index_number?.toLowerCase().includes(q);
      const matchName = `${t.first_name} ${t.last_name}`.toLowerCase().includes(q);
      const matchPrevSchool = t.previous_school?.toLowerCase().includes(q);
      const matchDestSchool = t.destination_school?.toLowerCase().includes(q);
      return matchRef || matchIndex || matchName || matchPrevSchool || matchDestSchool;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Transfers
            </CardTitle>
            <ArrowRightLeft className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.transferInCount} in &bull; {metrics.transferOutCount} out
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Clearance
            </CardTitle>
            <Clock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {metrics.pendingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting Academic or Finance sign-off
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Approved / Enrolled
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {metrics.approvedCount + metrics.completedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Headmaster cleared & fully executed
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Rejected / Cancelled
            </CardTitle>
            <AlertCircle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {metrics.rejectedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Failed clearance or withdrawn
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Header & WAEC STP banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-primary/[0.02]">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileCheck className="size-4 text-primary" />
            Official WAEC Student Transfer Process (STP)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clearance workflows sync with the Ministry of Education & WAEC SHS portal guidelines.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://stpshs.waecgh.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium bg-background hover:bg-muted text-foreground transition-colors"
          >
            <span>WAEC STP Official Portal</span>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </a>
          <Link href="/academic/waec-stp">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <FileCheck className="size-3.5 text-primary" />
              <span>WAEC Readiness Checker</span>
            </Button>
          </Link>
          <Link href="/students/transfers/in">
            <Button size="sm" className="gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white">
              <ArrowDownLeft className="size-3.5" />
              <span>Transfer-In (Admit)</span>
            </Button>
          </Link>
          <Link href="/students/transfers/out">
            <Button size="sm" variant="default" className="gap-1.5 text-xs">
              <ArrowUpRight className="size-3.5" />
              <span>Transfer-Out (Clearance)</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "all"
                ? "bg-background shadow-xs text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Transfers ({metrics.total})
          </button>
          <button
            onClick={() => setActiveTab("in")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "in"
                ? "bg-background shadow-xs text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Transfer-In ({metrics.transferInCount})
          </button>
          <button
            onClick={() => setActiveTab("out")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "out"
                ? "bg-background shadow-xs text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Transfer-Out ({metrics.transferOutCount})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "pending"
                ? "bg-background shadow-xs text-amber-800 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending Clearance ({metrics.pendingCount})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "completed"
                ? "bg-background shadow-xs text-emerald-800 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Completed ({metrics.completedCount + metrics.approvedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ref, index, name, school..."
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Transfers Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">STP Reference</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Academic</th>
                  <th className="px-4 py-3">Finance</th>
                  <th className="px-4 py-3">Overall Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No transfer records found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((t) => {
                    const isIn = t.direction === "transfer_in";
                    const isAcademicCleared = t.academic_clearance_status === "cleared";
                    const isFinanceCleared = t.finance_clearance_status === "cleared";

                    return (
                      <tr key={t.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono font-semibold text-foreground">
                          {t.transfer_reference}
                        </td>
                        <td className="px-4 py-3">
                          {isIn ? (
                            <Badge
                              variant="outline"
                              className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px] gap-1"
                            >
                              <ArrowDownLeft className="size-3" />
                              Transfer In
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-700 bg-amber-50 border-amber-200 text-[10px] gap-1"
                            >
                              <ArrowUpRight className="size-3" />
                              Transfer Out
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">
                            {t.first_name} {t.last_name}
                          </p>
                          <p className="text-muted-foreground font-mono text-[11px]">
                            {t.jhs_index_number} &bull; <span className="capitalize">{t.gender}</span>
                          </p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-44 truncate">
                          {isIn ? t.previous_school : t.destination_school}
                        </td>
                        <td className="px-4 py-3">
                          {isAcademicCleared ? (
                            <Badge
                              variant="outline"
                              className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px]"
                            >
                              Cleared
                            </Badge>
                          ) : t.academic_clearance_status === "flagged" ? (
                            <Badge
                              variant="outline"
                              className="text-destructive bg-destructive/10 border-destructive/30 text-[10px]"
                            >
                              Flagged
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-700 bg-amber-50 border-amber-200 text-[10px]"
                            >
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isFinanceCleared ? (
                            <Badge
                              variant="outline"
                              className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px]"
                            >
                              Cleared
                            </Badge>
                          ) : t.finance_clearance_status === "flagged" ? (
                            <Badge
                              variant="outline"
                              className="text-destructive bg-destructive/10 border-destructive/30 text-[10px]"
                            >
                              Flagged
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-700 bg-amber-50 border-amber-200 text-[10px]"
                            >
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`capitalize text-[10px] ${
                              t.status === "approved" || t.status === "enrolled" || t.status === "completed"
                                ? "text-emerald-800 bg-emerald-50 border-emerald-200 font-semibold"
                                : t.status === "rejected"
                                ? "text-destructive bg-destructive/10 border-destructive/30"
                                : "text-amber-800 bg-amber-50 border-amber-200"
                            }`}
                          >
                            {t.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(t.transfer_date).toLocaleDateString("en-GH", {
                            dateStyle: "medium",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/students/transfers/${t.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              Review
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
