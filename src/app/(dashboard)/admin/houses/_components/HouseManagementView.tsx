"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Home,
  Users,
  Percent,
  Plus,
  Edit2,
  RefreshCw,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  Download,
  Search,
  ShieldCheck,
  Check,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import {
  createHouseAction,
  updateHouseAction,
  rebalanceHousesAction,
} from "@/lib/actions/admin";
import {
  computeHouseRebalance,
  type HouseDistributionItem,
  type RebalancePlan,
} from "@/lib/services/house-allocation";
import type { HouseStudentRosterItem } from "@/lib/data";

interface HouseManagementViewProps {
  distributions: HouseDistributionItem[];
  students: HouseStudentRosterItem[];
}

export function HouseManagementView({
  distributions,
  students,
}: HouseManagementViewProps) {
  const [isPending, startTransition] = useTransition();

  // Create House Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Edit House Modal State
  const [editingHouse, setEditingHouse] = useState<HouseDistributionItem | null>(null);

  // Rebalance Wizard Modal State (4 Steps: 1=Preview, 2=Review, 3=Confirm, 4=Executing)
  const [isRebalanceOpen, setIsRebalanceOpen] = useState(false);
  const [rebalanceStep, setRebalanceStep] = useState<1 | 2 | 3>(1);
  const [rebalancePlan, setRebalancePlan] = useState<RebalancePlan | null>(null);
  const [confirmedAuth, setConfirmedAuth] = useState(false);

  // Roster Tab & Filters
  const [selectedHouseTab, setSelectedHouseTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");

  // Status message
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Aggregated stats
  const totalHouses = distributions.length;
  const activeHouses = distributions.filter((h) => h.is_active).length;
  const totalStudents = students.length;
  const totalAssigned = students.filter((s) => Boolean(s.houseId)).length;
  const totalUnassigned = students.filter((s) => !s.houseId).length;
  const totalMale = students.filter((s) => s.gender === "male").length;
  const totalFemale = students.filter((s) => s.gender === "female").length;

  const totalCapacity = distributions
    .filter((h) => h.is_active)
    .reduce((acc, h) => acc + h.capacity, 0);
  const overallOccupancy =
    totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;

  // Open Rebalance Simulation Wizard
  function handleOpenRebalance() {
    setStatusMessage(null);
    setConfirmedAuth(false);
    setRebalanceStep(1);
    const plan = computeHouseRebalance(students, distributions);
    setRebalancePlan(plan);
    setIsRebalanceOpen(true);
  }

  // Execute Rebalance Moves
  function handleExecuteRebalance() {
    if (!rebalancePlan || rebalancePlan.moves.length === 0) return;

    startTransition(async () => {
      const payload = rebalancePlan.moves.map((m) => ({
        studentId: m.studentId,
        toHouseId: m.toHouseId,
        fromHouseId: m.fromHouseId,
        studentName: m.studentName,
        jhsIndexNumber: m.jhsIndexNumber,
      }));

      const res = await rebalanceHousesAction(payload);
      setIsRebalanceOpen(false);
      setRebalancePlan(null);
      setConfirmedAuth(false);

      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
      } else {
        setStatusMessage({ type: "error", text: res.message });
      }
    });
  }

  // Handle Edit House Submit
  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateHouseAction(formData);
      setEditingHouse(null);

      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
      } else {
        setStatusMessage({ type: "error", text: res.message });
      }
    });
  }

  // Filtered Roster
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // House filter
      if (selectedHouseTab === "unassigned") {
        if (s.houseId) return false;
      } else if (selectedHouseTab !== "all") {
        if (s.houseId !== selectedHouseTab) return false;
      }

      // Gender filter
      if (genderFilter !== "all" && s.gender !== genderFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.fullName.toLowerCase().includes(q);
        const matchIndex = s.jhsIndexNumber.toLowerCase().includes(q);
        const matchProg = s.programName?.toLowerCase().includes(q);
        if (!matchName && !matchIndex && !matchProg) return false;
      }

      return true;
    });
  }, [students, selectedHouseTab, genderFilter, searchQuery]);

  // Export Roster to CSV
  function handleExportCSV() {
    const headers = ["JHS Index Number", "Full Name", "Gender", "House", "Program", "Status"];
    const rows = filteredStudents.map((s) => [
      `"${s.jhsIndexNumber}"`,
      `"${s.fullName}"`,
      s.gender.toUpperCase(),
      `"${s.houseName}"`,
      `"${s.programName || "General"}"`,
      s.enrollmentStatus.toUpperCase(),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `khulafasco-house-roster-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Print Roster
  function handlePrintRoster() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {statusMessage && (
        <div
          role="alert"
          className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="size-5 text-destructive shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusMessage(null)}
            className="h-7 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* School-Wide Population & Allocation Overview Banner */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground text-base sm:text-lg">
              Residential Allocation Overview
            </span>
            {totalUnassigned === 0 ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-xs">
                <CheckCircle2 className="size-3" />
                100% Allocated & Balanced
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 gap-1 text-xs">
                <AlertTriangle className="size-3 text-amber-700" />
                {totalUnassigned} Unassigned Student{totalUnassigned === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalStudents} enrolled students evaluated across {activeHouses} active houses ({totalMale} Boys, {totalFemale} Girls).
            {totalUnassigned > 0
              ? ` Rebalance engine can immediately allocate ${totalUnassigned} student${totalUnassigned === 1 ? "" : "s"} to achieve equal house and gender parity.`
              : " All 4 houses maintain equal distribution with minimal gender disparity."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="default"
            size="sm"
            onClick={handleOpenRebalance}
            className="gap-1.5 shadow-sm"
            disabled={isPending || distributions.length <= 1}
          >
            <Scale className="size-4" />
            <span>{totalUnassigned > 0 ? "Allocate & Balance Houses" : "Simulate Rebalance"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            <span>Add House</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Enrolled Students
            </CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalMale} Boys &bull; {totalFemale} Girls
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned vs Unassigned
            </CardTitle>
            <UserCheck className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAssigned} <span className="text-xs font-normal text-muted-foreground">/ {totalStudents}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalUnassigned > 0 ? (
                <span className="text-amber-600 font-medium">{totalUnassigned} pending allocation</span>
              ) : (
                <span className="text-emerald-600 font-medium">All students assigned</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Capacity & Occupancy
            </CardTitle>
            <Percent className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallOccupancy}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalAssigned} / {totalCapacity} beds utilized
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Houses
            </CardTitle>
            <Home className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeHouses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalHouses} registered residential houses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4 Residential Houses Grid */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Home className="size-4 text-primary" />
          <span>Residential Houses Overview</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {distributions.map((h) => {
            const isOver = h.totalCount >= h.capacity;
            const isNear = h.totalCount >= h.capacity * 0.85 && !isOver;

            return (
              <Card key={h.id} className="border-border shadow-xs hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">{h.name}</CardTitle>
                      <span className="font-mono text-xs text-muted-foreground">Code: {h.code || "---"}</span>
                    </div>
                    {h.is_active ? (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground bg-muted text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Population</span>
                    <span className="font-bold text-foreground text-sm">{h.totalCount}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-md p-2 text-center">
                      <span className="text-[10px] uppercase font-semibold text-blue-700 block">Boys</span>
                      <span className="text-base font-bold text-blue-800">{h.maleCount}</span>
                    </div>
                    <div className="bg-pink-50/50 border border-pink-100 rounded-md p-2 text-center">
                      <span className="text-[10px] uppercase font-semibold text-pink-700 block">Girls</span>
                      <span className="text-base font-bold text-pink-800">{h.femaleCount}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Occupancy ({h.totalCount}/{h.capacity})</span>
                      <span className="font-mono font-medium">{h.occupancyPercent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver ? "bg-destructive" : isNear ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(h.occupancyPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <Link
                      href={`/house/dashboard?houseId=${h.id}`}
                      className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <span>House Dashboard</span>
                      <ChevronRight className="size-3" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingHouse(h)}
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="size-3" />
                      <span>Edit</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* House Roster Section */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span>Student House Roster</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review residential assignments, filter by house, print, or export roster.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-1.5 h-8 text-xs"
              >
                <Download className="size-3.5" />
                <span>Export CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintRoster}
                className="gap-1.5 h-8 text-xs"
              >
                <Printer className="size-3.5" />
                <span>Print Roster</span>
              </Button>
            </div>
          </div>

          {/* House Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            <button
              onClick={() => setSelectedHouseTab("all")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedHouseTab === "all"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              All Houses ({totalStudents})
            </button>
            {distributions.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelectedHouseTab(h.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedHouseTab === h.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {h.name} ({h.totalCount})
              </button>
            ))}
            {totalUnassigned > 0 && (
              <button
                onClick={() => setSelectedHouseTab("unassigned")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedHouseTab === "unassigned"
                    ? "bg-amber-600 text-white font-semibold shadow-xs"
                    : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                Unassigned ({totalUnassigned})
              </button>
            )}
          </div>

          {/* Search & Gender Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search student or index number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-xs text-muted-foreground mr-1">Gender:</span>
              <button
                onClick={() => setGenderFilter("all")}
                className={`px-2.5 py-1 rounded-md text-xs ${
                  genderFilter === "all" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setGenderFilter("male")}
                className={`px-2.5 py-1 rounded-md text-xs ${
                  genderFilter === "male" ? "bg-blue-100 text-blue-900 font-bold" : "text-muted-foreground"
                }`}
              >
                Boys
              </button>
              <button
                onClick={() => setGenderFilter("female")}
                className={`px-2.5 py-1 rounded-md text-xs ${
                  genderFilter === "female" ? "bg-pink-100 text-pink-900 font-bold" : "text-muted-foreground"
                }`}
              >
                Girls
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm print:text-xs">
              <thead className="bg-muted/30 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">JHS Index Number</th>
                  <th className="px-4 py-3">Student Full Name</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Assigned House</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No student records found matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        {s.jhsIndexNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar
                            jhsIndexNumber={s.jhsIndexNumber}
                            firstName={s.firstName || s.fullName.split(" ")[0] || ""}
                            lastName={s.lastName || s.fullName.split(" ").slice(1).join(" ") || ""}
                            photoPath={s.photoPath}
                            size="sm"
                          />
                          <span>{s.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.gender === "male" ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                            Male
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 text-[10px]">
                            Female
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {s.programName || "General"}
                      </td>
                      <td className="px-4 py-3">
                        {s.houseId ? (
                          <Badge variant="outline" className="bg-muted/80 text-foreground font-semibold text-xs">
                            {s.houseName}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs">
                            Unassigned
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="capitalize text-xs text-emerald-700 font-medium">
                          {s.enrollmentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE HOUSE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New House</DialogTitle>
            <DialogDescription>
              Register a residential house for student allocation.
            </DialogDescription>
          </DialogHeader>
          <form action={createHouseAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">House Name *</Label>
              <Input
                id="create-name"
                name="name"
                placeholder="e.g. Abubakar House"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-code">House Code</Label>
                <Input
                  id="create-code"
                  name="code"
                  placeholder="e.g. ABU"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-capacity">Capacity</Label>
                <Input
                  id="create-capacity"
                  name="capacity"
                  type="number"
                  defaultValue={150}
                  min={1}
                  required
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create House</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT HOUSE DIALOG */}
      <Dialog
        open={Boolean(editingHouse)}
        onOpenChange={(open) => !open && setEditingHouse(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit House Details</DialogTitle>
            <DialogDescription>
              Update capacity, code, or active allocation status for this house.
            </DialogDescription>
          </DialogHeader>
          {editingHouse && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input type="hidden" name="id" value={editingHouse.id} />
              <div className="space-y-2">
                <Label htmlFor="edit-name">House Name *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingHouse.name}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">House Code</Label>
                  <Input
                    id="edit-code"
                    name="code"
                    defaultValue={editingHouse.code}
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-capacity">Capacity</Label>
                  <Input
                    id="edit-capacity"
                    name="capacity"
                    type="number"
                    defaultValue={editingHouse.capacity}
                    min={1}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-active"
                  name="is_active"
                  defaultChecked={editingHouse.is_active}
                  className="size-4 rounded border-input"
                />
                <Label htmlFor="edit-active" className="cursor-pointer">
                  Active for automatic student allocation
                </Label>
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingHouse(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 4-STEP REBALANCE & ALLOCATION WIZARD MODAL */}
      <Dialog open={isRebalanceOpen} onOpenChange={setIsRebalanceOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Scale className="size-5 text-primary" />
                <span>House Allocation & Gender-Balancing Engine</span>
              </DialogTitle>
              <Badge variant="outline" className="text-xs font-medium">
                {students.length} Students Evaluated
              </Badge>
            </div>
            <DialogDescription>
              Preview, review, and atomically execute deterministic allocation across active houses.
            </DialogDescription>
          </DialogHeader>

          {/* Wizard Step Indicator */}
          <div className="flex items-center justify-between border-b border-border pb-3 text-xs">
            <div
              className={`flex items-center gap-1.5 cursor-pointer ${
                rebalanceStep === 1 ? "text-primary font-bold" : "text-muted-foreground"
              }`}
              onClick={() => setRebalanceStep(1)}
            >
              <span className={`size-5 rounded-full flex items-center justify-center text-[10px] ${
                rebalanceStep === 1 ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-foreground"
              }`}>1</span>
              <span>1. Preview Breakdown</span>
            </div>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <div
              className={`flex items-center gap-1.5 cursor-pointer ${
                rebalanceStep === 2 ? "text-primary font-bold" : "text-muted-foreground"
              }`}
              onClick={() => setRebalanceStep(2)}
            >
              <span className={`size-5 rounded-full flex items-center justify-center text-[10px] ${
                rebalanceStep === 2 ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-foreground"
              }`}>2</span>
              <span>2. Review Students ({rebalancePlan?.moves.length ?? 0})</span>
            </div>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <div
              className={`flex items-center gap-1.5 cursor-pointer ${
                rebalanceStep === 3 ? "text-primary font-bold" : "text-muted-foreground"
              }`}
              onClick={() => setRebalanceStep(3)}
            >
              <span className={`size-5 rounded-full flex items-center justify-center text-[10px] ${
                rebalanceStep === 3 ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-foreground"
              }`}>3</span>
              <span>3. Confirm Authorization</span>
            </div>
          </div>

          {rebalancePlan && (
            <div className="space-y-4 py-1 text-xs">
              {/* STEP 1: PREVIEW COMPARISON */}
              {rebalanceStep === 1 && (
                <div className="space-y-4">
                  {rebalancePlan.isBalanced ? (
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-2.5">
                      <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-semibold">Optimal House & Gender Balance Achieved!</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          All {rebalancePlan.totalEvaluated} enrolled students are allocated. House populations and gender distributions are already in mathematical equilibrium.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-900 flex items-start gap-2.5">
                      <Scale className="size-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold text-xs sm:text-sm">
                          Allocation Plan: {rebalancePlan.totalMoves} student update{rebalancePlan.totalMoves === 1 ? "" : "s"} required
                        </p>
                        <p className="text-[11px] text-blue-700">
                          {rebalancePlan.totalNewAssignments} new assignment{rebalancePlan.totalNewAssignments === 1 ? "" : "s"} from unassigned students &bull; {rebalancePlan.totalReassignments} house transfer{rebalancePlan.totalReassignments === 1 ? "" : "s"} &bull; {rebalancePlan.stayingStudents.length} students retain existing houses.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px] mb-2">
                      House Balance Comparison: Current vs Proposed
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-[10px] text-muted-foreground uppercase">
                          <tr>
                            <th className="px-3 py-2.5">House</th>
                            <th className="px-3 py-2.5">Current (M / F / Total)</th>
                            <th className="px-3 py-2.5">Proposed (M / F / Total)</th>
                            <th className="px-3 py-2.5">Net Change</th>
                            <th className="px-3 py-2.5">Capacity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {rebalancePlan.proposedDistribution.map((prop) => {
                            const curr = rebalancePlan.currentDistribution.find((c) => c.id === prop.id);
                            const net = prop.totalCount - (curr?.totalCount ?? 0);
                            return (
                              <tr key={prop.id} className="hover:bg-muted/10">
                                <td className="px-3 py-2 font-semibold text-foreground">{prop.name}</td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {curr?.maleCount}M &bull; {curr?.femaleCount}F (<span className="font-medium text-foreground">{curr?.totalCount}</span>)
                                </td>
                                <td className="px-3 py-2 font-bold text-foreground">
                                  {prop.maleCount}M &bull; {prop.femaleCount}F (<span className="text-primary">{prop.totalCount}</span>)
                                </td>
                                <td className="px-3 py-2">
                                  {net > 0 ? (
                                    <span className="text-emerald-700 font-semibold">+{net}</span>
                                  ) : net < 0 ? (
                                    <span className="text-destructive font-semibold">{net}</span>
                                  ) : (
                                    <span className="text-muted-foreground">0</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {prop.totalCount} / {prop.capacity}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: REVIEW STUDENTS */}
              {rebalanceStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                        Students Being Allocated / Transferred ({rebalancePlan.moves.length})
                      </h4>
                      <Badge variant="outline" className="text-[10px]">
                        {rebalancePlan.totalNewAssignments} New Assignments
                      </Badge>
                    </div>
                    {rebalancePlan.moves.length === 0 ? (
                      <p className="text-muted-foreground text-xs p-3 bg-muted/20 rounded-lg">
                        No students need to be moved.
                      </p>
                    ) : (
                      <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                        {rebalancePlan.moves.map((m, idx) => (
                          <div
                            key={`${m.studentId}-${idx}`}
                            className="px-3 py-2 flex items-center justify-between text-xs hover:bg-muted/20"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                                  {m.jhsIndexNumber || "N/A"}
                                </span>
                                <span className="font-semibold text-foreground">{m.studentName}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] ${
                                    m.gender === "male"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-pink-50 text-pink-700 border-pink-200"
                                  }`}
                                >
                                  {m.gender}
                                </Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {m.isNewAssignment ? "Unallocated student enrollment" : "Cross-house rebalance transfer"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-muted-foreground">{m.fromHouseName}</span>
                              <ArrowRight className="size-3 text-muted-foreground" />
                              <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
                                {m.toHouseName}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Staying Students Section */}
                  <div>
                    <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px] mb-2">
                      Students Retaining Current House Affiliation ({rebalancePlan.stayingStudents.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                      {rebalancePlan.stayingStudents.map((s, idx) => (
                        <div
                          key={`${s.studentId}-${idx}`}
                          className="px-3 py-1.5 flex items-center justify-between text-xs hover:bg-muted/10"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-foreground">{s.jhsIndexNumber}</span>
                            <span className="font-medium">{s.studentName}</span>
                            <span className="text-muted-foreground capitalize text-[10px]">({s.gender})</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                            Stays in {s.houseName}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: CONFIRMATION */}
              {rebalanceStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                    <div className="flex items-center gap-2 text-foreground font-bold">
                      <ShieldCheck className="size-5 text-primary" />
                      <span>Authorization & Audit Verification</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-background border border-border">
                        <span className="text-[10px] text-muted-foreground uppercase block">Evaluated</span>
                        <span className="font-bold text-sm">{rebalancePlan.totalEvaluated}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-background border border-border">
                        <span className="text-[10px] text-muted-foreground uppercase block">New Assigned</span>
                        <span className="font-bold text-sm text-emerald-700">+{rebalancePlan.totalNewAssignments}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-background border border-border">
                        <span className="text-[10px] text-muted-foreground uppercase block">Reassigned</span>
                        <span className="font-bold text-sm text-amber-700">{rebalancePlan.totalReassignments}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-background border border-border">
                        <span className="text-[10px] text-muted-foreground uppercase block">Unchanged</span>
                        <span className="font-bold text-sm text-muted-foreground">{rebalancePlan.stayingStudents.length}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Authorizing this operation will atomically update the student records and immediately record immutable entries in the IT Audit Center under module <strong className="text-foreground">HOUSE</strong> with full before/after states.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <input
                      type="checkbox"
                      id="confirm-auth"
                      checked={confirmedAuth}
                      onChange={(e) => setConfirmedAuth(e.target.checked)}
                      className="size-4 rounded border-input mt-0.5 cursor-pointer"
                    />
                    <Label htmlFor="confirm-auth" className="text-xs leading-relaxed cursor-pointer font-medium">
                      I confirm that I have reviewed the proposed house allocations for all {rebalancePlan.totalEvaluated} students and authorize the system to execute these changes.
                    </Label>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              {rebalanceStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRebalanceStep((s) => (s - 1) as 1 | 2)}
                  disabled={isPending}
                >
                  &larr; Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsRebalanceOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>

              {rebalanceStep === 1 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setRebalanceStep(2)}
                  disabled={!rebalancePlan || rebalancePlan.moves.length === 0}
                  className="gap-1"
                >
                  <span>Review Students ({rebalancePlan?.moves.length ?? 0})</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              )}

              {rebalanceStep === 2 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setRebalanceStep(3)}
                  className="gap-1"
                >
                  <span>Proceed to Authorization</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              )}

              {rebalanceStep === 3 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExecuteRebalance}
                  disabled={!confirmedAuth || isPending}
                  className="gap-1.5"
                >
                  {isPending ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>Executing Atomic Rebalancing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      <span>Execute Rebalance ({rebalancePlan?.moves.length ?? 0} Students)</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
