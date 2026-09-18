"use client";

import { useState } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  FileCode,
  Download,
} from "lucide-react";
import {
  AUDIT_MODULES,
  AUDIT_SEVERITIES,
  ROLES,
  ROLE_LABELS,
} from "@/config/constants";
import type { AuditLog, Profile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SecurityAuditCenterClientProps {
  initialLogs: AuditLog[];
  staffList: Profile[];
}

export function SecurityAuditCenterClient({
  initialLogs,
  staffList,
}: SecurityAuditCenterClientProps) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  const [detailModalLog, setDetailModalLog] = useState<AuditLog | null>(null);
  const logs = initialLogs;

  // Filter in-memory or on server
  const filteredLogs = logs.filter((log) => {
    // Search query matches target, action, or description
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      log.action.toLowerCase().includes(query) ||
      (log.description && log.description.toLowerCase().includes(query)) ||
      (log.target_identifier && log.target_identifier.toLowerCase().includes(query)) ||
      (log.profile?.full_name && log.profile.full_name.toLowerCase().includes(query));

    // Module
    const matchesModule = selectedModule === "all" || log.module === selectedModule;

    // Severity
    const matchesSeverity = selectedSeverity === "all" || log.severity === selectedSeverity;

    // Status
    const matchesStatus = selectedStatus === "all" || log.status === selectedStatus;

    // Role
    const logRole = log.actor_role || log.profile?.role;
    const matchesRole = selectedRole === "all" || logRole === selectedRole;

    // User
    const matchesUser = selectedUserId === "all" || log.user_id === selectedUserId;

    // Date range
    let matchesDate = true;
    if (fromDate) {
      matchesDate = matchesDate && log.created_at >= `${fromDate}T00:00:00.000Z`;
    }
    if (toDate) {
      matchesDate = matchesDate && log.created_at <= `${toDate}T23:59:59.999Z`;
    }

    return (
      matchesSearch &&
      matchesModule &&
      matchesSeverity &&
      matchesStatus &&
      matchesRole &&
      matchesUser &&
      matchesDate
    );
  });

  function handleResetFilters() {
    setSearch("");
    setFromDate("");
    setToDate("");
    setSelectedModule("all");
    setSelectedSeverity("all");
    setSelectedStatus("all");
    setSelectedRole("all");
    setSelectedUserId("all");
  }

  function handleExportCsv() {
    if (filteredLogs.length === 0) return;
    const headers = [
      "Timestamp",
      "Actor Name",
      "Actor Email",
      "Role",
      "Module",
      "Action",
      "Target Identifier",
      "Severity",
      "Status",
      "Description",
    ];
    const rows = filteredLogs.map((log) => [
      `"${new Date(log.created_at).toISOString()}"`,
      `"${(log.profile?.full_name || "System / User").replace(/"/g, '""')}"`,
      `"${(log.profile?.email || "").replace(/"/g, '""')}"`,
      `"${(log.actor_role || log.profile?.role || "staff").replace(/"/g, '""')}"`,
      `"${(log.module || "SYSTEM").replace(/"/g, '""')}"`,
      `"${log.action.replace(/"/g, '""')}"`,
      `"${(log.target_identifier || log.entity_id || "").replace(/"/g, '""')}"`,
      `"${log.severity || "INFO"}"`,
      `"${log.status || "SUCCESS"}"`,
      `"${(log.description || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `khulafasco_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function getSeverityBadge(severity?: string | null) {
    switch (severity) {
      case "CRITICAL":
        return (
          <Badge className="bg-red-600 text-white text-[10px] uppercase font-bold tracking-wider">
            Critical
          </Badge>
        );
      case "SECURITY":
        return (
          <Badge className="bg-purple-600 text-white text-[10px] uppercase font-bold tracking-wider">
            Security
          </Badge>
        );
      case "WARNING":
        return (
          <Badge className="bg-amber-500 text-white text-[10px] uppercase font-bold tracking-wider">
            Warning
          </Badge>
        );
      case "INFO":
      default:
        return (
          <Badge variant="outline" className="text-[10px] uppercase font-medium text-muted-foreground">
            Info
          </Badge>
        );
    }
  }

  function getStatusBadge(status?: string | null) {
    if (status === "FAILED" || status === "DENIED") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
          <XCircle className="size-3" /> {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
        <CheckCircle2 className="size-3" /> {status || "SUCCESS"}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Multi-Criteria Filter Hub */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Audit Search & Investigation Filters</CardTitle>
          </div>
          {(search || fromDate || toDate || selectedModule !== "all" || selectedSeverity !== "all" || selectedRole !== "all") && (
            <Button variant="ghost" size="xs" onClick={handleResetFilters} className="text-xs text-muted-foreground">
              <X className="size-3 mr-1" /> Reset All Filters
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, description, target index, or staff name..."
              className="pl-9 text-sm"
            />
          </div>

          {/* Date Range & Severity Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-xs">
            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                From Date
              </label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                To Date
              </label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                Module
              </label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Modules</option>
                {AUDIT_MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                Severity
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Severities</option>
                {AUDIT_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                Staff User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Users</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-medium focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
                <option value="DENIED">DENIED</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail Results */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              Chronological Audit Trail ({filteredLogs.length} Records)
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="xs"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="text-xs"
          >
            <Download className="size-3.5 mr-1" /> Export CSV
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldAlert className="size-12 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No matching audit events found</p>
              <p className="text-xs text-muted-foreground mt-1">Try expanding your date range or clearing filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor / User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Module</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLogs.map((log) => {
                    const actorName = log.profile?.full_name || "System / User";
                    const actorRole = log.actor_role || log.profile?.role || "staff";

                    return (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("en-GH", {
                            dateStyle: "short",
                            timeStyle: "medium",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{actorName}</div>
                          {log.profile?.email && (
                            <div className="text-[10px] text-muted-foreground font-mono">{log.profile.email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {actorRole.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-muted-foreground">{log.module || "SYSTEM"}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {log.action}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground max-w-[140px] truncate">
                          {log.target_identifier || log.entity_id || "—"}
                        </td>
                        <td className="px-4 py-3">{getSeverityBadge(log.severity)}</td>
                        <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setDetailModalLog(log)}
                            className="text-xs"
                          >
                            <Eye className="size-3.5 mr-1" /> View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* EVENT DETAIL MODAL */}
      <Dialog open={!!detailModalLog} onOpenChange={(open) => !open && setDetailModalLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {getSeverityBadge(detailModalLog?.severity)}
              <DialogTitle className="text-base font-bold font-heading">
                Audit Event: {detailModalLog?.action}
              </DialogTitle>
            </div>
            <DialogDescription className="font-mono text-xs">
              Event ID: {detailModalLog?.id}
            </DialogDescription>
          </DialogHeader>

          {detailModalLog && (
            <div className="space-y-4 py-3 text-xs">
              {/* Event Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg border border-border bg-muted/20">
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Actor</span>
                  <span className="font-semibold text-foreground">{detailModalLog.profile?.full_name || "System"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Actor Role</span>
                  <span className="font-semibold capitalize">{detailModalLog.actor_role || detailModalLog.profile?.role || "Staff"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Exact Timestamp</span>
                  <span className="font-mono text-foreground">{new Date(detailModalLog.created_at).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "long" })}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Module</span>
                  <span className="font-semibold">{detailModalLog.module || "SYSTEM"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Target Identifier</span>
                  <span className="font-mono text-foreground">{detailModalLog.target_identifier || detailModalLog.entity_id || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block">Result Status</span>
                  <span>{getStatusBadge(detailModalLog.status)}</span>
                </div>
              </div>

              {/* Description */}
              {detailModalLog.description && (
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block mb-1">Description</span>
                  <div className="p-3 rounded-lg border border-border bg-card text-foreground font-medium">
                    {detailModalLog.description}
                  </div>
                </div>
              )}

              {/* Before & After Data Context */}
              {(detailModalLog.before_data || detailModalLog.after_data) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {detailModalLog.before_data && (
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold block mb-1 flex items-center gap-1">
                        <FileCode className="size-3 text-amber-600" /> State Before Action
                      </span>
                      <pre className="p-3 rounded-lg bg-muted/40 border border-border font-mono text-[11px] overflow-x-auto max-h-40">
                        {JSON.stringify(detailModalLog.before_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {detailModalLog.after_data && (
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold block mb-1 flex items-center gap-1">
                        <FileCode className="size-3 text-emerald-600" /> State After Action
                      </span>
                      <pre className="p-3 rounded-lg bg-muted/40 border border-border font-mono text-[11px] overflow-x-auto max-h-40">
                        {JSON.stringify(detailModalLog.after_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Metadata */}
              {detailModalLog.metadata && (
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold block mb-1">Additional Metadata</span>
                  <pre className="p-3 rounded-lg bg-muted/40 border border-border font-mono text-[11px] overflow-x-auto max-h-36">
                    {JSON.stringify(detailModalLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
