"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import type { HouseDashboardData } from "@/lib/data";
import type { House, HouseExeatRecord } from "@/types";
import { createHouseExeatAction, returnHouseExeatAction } from "@/lib/actions/house";

interface HouseExeatsViewProps {
  data: HouseDashboardData;
  initialExeats: HouseExeatRecord[];
  userRole?: string;
  userFullName?: string;
  allHouses?: House[];
  selectedHouseId?: string;
}

export function HouseExeatsView({
  data,
  initialExeats,
  allHouses = [],
}: HouseExeatsViewProps) {
  const { house, isAssigned, students } = data;

  const [exeats, setExeats] = useState<HouseExeatRecord[]>(initialExeats);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "returned" | "overdue">("active");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [reason, setReason] = useState("");
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [parentContacted, setParentContacted] = useState(false);
  const [remarks, setRemarks] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const processedExeats = useMemo(() => {
    return exeats.map((e) => {
      const isOverdue = e.status === "active" && e.expected_return_date < today;
      return {
        ...e,
        computedStatus: isOverdue ? "overdue" : e.status,
      };
    });
  }, [exeats, today]);

  const filteredExeats = useMemo(() => {
    return processedExeats.filter((e) => {
      const q = search.trim().toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = e.student as any;
      const studentName = s ? `${s.first_name} ${s.last_name}`.toLowerCase() : "";
      const indexNum = s?.jhs_index_number?.toLowerCase() || "";

      const matchesSearch =
        !q ||
        studentName.includes(q) ||
        indexNum.includes(q) ||
        e.reason.toLowerCase().includes(q);

      const matchesTab =
        activeTab === "all"
          ? true
          : activeTab === "overdue"
          ? e.computedStatus === "overdue"
          : e.status === activeTab;

      return matchesSearch && matchesTab;
    });
  }, [processedExeats, search, activeTab]);

  function handleCreateExeat(e: React.FormEvent) {
    e.preventDefault();
    if (!house) return;

    if (!selectedStudentId || !reason || !expectedReturnDate) {
      setFeedback({ type: "error", message: "Please fill all required fields." });
      return;
    }

    startTransition(async () => {
      setFeedback(null);
      const formData = new FormData();
      formData.set("student_id", selectedStudentId);
      formData.set("house_id", house.id);
      formData.set("reason", reason);
      formData.set("departure_date", departureDate);
      formData.set("expected_return_date", expectedReturnDate);
      formData.set("parent_contacted", parentContacted ? "true" : "false");
      formData.set("remarks", remarks);

      const res = await createHouseExeatAction(formData);
      if (res.success) {
        setFeedback({ type: "success", message: res.message || "Exeat issued successfully." });
        setIsDialogOpen(false);
        // Reset form
        setSelectedStudentId("");
        setReason("");
        setExpectedReturnDate("");
        setParentContacted(false);
        setRemarks("");
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to issue exeat." });
      }
    });
  }

  function handleMarkReturned(exeatId: string) {
    startTransition(async () => {
      setFeedback(null);
      const res = await returnHouseExeatAction(exeatId);
      if (res.success) {
        setFeedback({ type: "success", message: res.message || "Student marked as returned." });
        setExeats((prev) =>
          prev.map((item) =>
            item.id === exeatId
              ? { ...item, status: "returned", actual_return_date: today }
              : item
          )
        );
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update exeat." });
      }
    });
  }

  if (!isAssigned || !house) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No residential house assigned to your profile. Please contact an administrator.
      </div>
    );
  }

  const activeCount = processedExeats.filter((e) => e.status === "active").length;
  const overdueCount = processedExeats.filter((e) => e.computedStatus === "overdue").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/house/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="size-3" />
              <span>House Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold font-serif text-foreground">
            Exeat & Leave Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Issue permitted leaves of absence and monitor hostel returns for House {house.name}.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="text-xs gap-1.5 shadow-xs"
        >
          <Plus className="size-3.5" />
          <span>Issue New Exeat</span>
        </Button>
      </div>

      {/* Scope Switcher for Senior House Staff & Admin */}
      {allHouses.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Scope:</span>
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border flex-wrap">
            <Link
              href="/house/exeats?houseId=all"
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                house.id === "all"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Houses (School-Wide)
            </Link>
            {allHouses.map((h) => {
              const isActive = h.id === house.id;
              return (
                <Link
                  key={h.id}
                  href={`/house/exeats?houseId=${h.id}`}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {h.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold hover:underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* Exeats Card */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border space-y-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "active"
                  ? "bg-amber-600 text-white font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              Currently Away ({activeCount})
            </button>
            <button
              onClick={() => setActiveTab("overdue")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "overdue"
                  ? "bg-destructive text-destructive-foreground font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              Overdue ({overdueCount})
            </button>
            <button
              onClick={() => setActiveTab("returned")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "returned"
                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              Returned
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "all"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              All Records ({processedExeats.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80 pt-1">
            <Search className="absolute left-2.5 top-3.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search student or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 text-muted-foreground uppercase font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Reason / Purpose</th>
                  <th className="px-4 py-3">Departure Date</th>
                  <th className="px-4 py-3">Expected Return</th>
                  <th className="px-4 py-3">Parent Contacted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExeats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No exeat records found in this category.
                    </td>
                  </tr>
                ) : (
                  filteredExeats.map((exeat) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const s = exeat.student as any;
                    const isOverdue = exeat.computedStatus === "overdue";
                    return (
                      <tr key={exeat.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <StudentAvatar
                              jhsIndexNumber={s?.jhs_index_number || ""}
                              firstName={s?.first_name || ""}
                              lastName={s?.last_name || ""}
                              photoPath={s?.photo_path}
                              size="sm"
                            />
                            <div>
                              <div className="font-semibold text-foreground">
                                {s?.first_name} {s?.last_name}
                              </div>
                              <div className="font-mono text-[10px] text-muted-foreground">
                                {s?.jhs_index_number}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">{exeat.reason}</span>
                          {exeat.remarks && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-xs truncate">
                              {exeat.remarks}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {exeat.departure_date}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${isOverdue ? "text-destructive" : "text-foreground"}`}>
                            {exeat.expected_return_date}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {exeat.parent_contacted ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              Yes
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {exeat.status === "returned" ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                              Returned ({exeat.actual_return_date || "Yes"})
                            </Badge>
                          ) : isOverdue ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] font-bold">
                              Overdue
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                              Away
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {exeat.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkReturned(exeat.id)}
                              disabled={isPending}
                              className="h-7 text-[11px] gap-1 bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="size-3 text-emerald-600" />
                              <span>Mark Returned</span>
                            </Button>
                          )}
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

      {/* Issue Exeat Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" />
              <span>Issue Student Exeat Slip</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Officially sign out a student residing in House {house.name} for approved leave.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateExeat} className="space-y-3.5 text-xs">
            <div>
              <Label className="text-xs font-semibold">Select Student *</Label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground outline-none"
              >
                <option value="">-- Choose student in House {house.name} --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.jhsIndexNumber}) · {s.gender}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Reason for Leave *</Label>
              <Input
                placeholder="e.g., Medical treatment at Regional Hospital / Family emergency"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="h-8 text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Departure Date *</Label>
                <Input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  required
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Expected Return *</Label>
                <Input
                  type="date"
                  value={expectedReturnDate}
                  min={departureDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  required
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="parentContactedCheck"
                checked={parentContacted}
                onChange={(e) => setParentContacted(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="parentContactedCheck" className="text-xs text-foreground cursor-pointer">
                Parent / Guardian has been formally contacted and confirmed
              </label>
            </div>

            <div>
              <Label className="text-xs font-semibold">Remarks & Notes</Label>
              <Input
                placeholder="e.g., Accompanied by parent / Authorized medical note"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="text-xs"
              >
                {isPending ? "Issuing..." : "Confirm & Sign Exeat"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
