"use client";

import { useState, useTransition } from "react";
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
import type { Gender } from "@/config/constants";

interface HouseStudentItem {
  id: string;
  fullName: string;
  gender: Gender;
  houseId: string;
}

interface HouseManagementViewProps {
  distributions: HouseDistributionItem[];
  students: HouseStudentItem[];
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

  // Rebalance Simulation Modal State
  const [isRebalanceOpen, setIsRebalanceOpen] = useState(false);
  const [rebalancePlan, setRebalancePlan] = useState<RebalancePlan | null>(null);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Aggregated stats
  const totalHouses = distributions.length;
  const activeHouses = distributions.filter((h) => h.is_active).length;
  const totalStudents = distributions.reduce((acc, h) => acc + h.totalCount, 0);
  const totalMale = distributions.reduce((acc, h) => acc + h.maleCount, 0);
  const totalFemale = distributions.reduce((acc, h) => acc + h.femaleCount, 0);
  const totalCapacity = distributions
    .filter((h) => h.is_active)
    .reduce((acc, h) => acc + h.capacity, 0);
  const overallOccupancy =
    totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

  // Open Rebalance Simulation
  function handleOpenRebalance() {
    setStatusMessage(null);
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
      }));

      const res = await rebalanceHousesAction(payload);
      setIsRebalanceOpen(false);
      setRebalancePlan(null);

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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Houses
            </CardTitle>
            <Home className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHouses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeHouses} active for automatic allocation
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              House Population
            </CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalMale} boys &bull; {totalFemale} girls
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Capacity & Occupancy
            </CardTitle>
            <Percent className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallOccupancy}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalStudents} / {totalCapacity} bed capacity
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Gender Distribution
            </CardTitle>
            <Scale className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalStudents > 0
                ? `${Math.round((totalMale / totalStudents) * 100)}% M / ${Math.round(
                    (totalFemale / totalStudents) * 100
                  )}% F`
                : "0% / 0%"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all residential houses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Active Residential Houses & Allocation Balance
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure house capacities, codes, and balance students deterministically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenRebalance}
            className="gap-1.5"
            disabled={isPending || distributions.length <= 1}
          >
            <Scale className="size-4 text-primary" />
            <span>Simulate Rebalancing</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            <span>Add New House</span>
          </Button>
        </div>
      </div>

      {/* Houses Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">House</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Male</th>
                  <th className="px-4 py-3">Female</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Occupancy</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {distributions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No houses registered yet. Click &ldquo;Add New House&rdquo; to begin.
                    </td>
                  </tr>
                ) : (
                  distributions.map((h) => {
                    const isOver = h.totalCount >= h.capacity;
                    const isNear = h.totalCount >= h.capacity * 0.85 && !isOver;

                    return (
                      <tr key={h.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {h.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {h.code || "---"}
                        </td>
                        <td className="px-4 py-3">
                          {h.is_active ? (
                            <Badge
                              variant="outline"
                              className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground bg-muted border-border text-xs"
                            >
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-blue-700 font-medium">
                          {h.maleCount}
                        </td>
                        <td className="px-4 py-3 text-pink-700 font-medium">
                          {h.femaleCount}
                        </td>
                        <td className="px-4 py-3 font-bold">{h.totalCount}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {h.capacity}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-28">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isOver
                                    ? "bg-destructive"
                                    : isNear
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{
                                  width: `${Math.min(h.occupancyPercent, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">
                              {h.occupancyPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingHouse(h)}
                            className="h-8 gap-1 text-xs"
                          >
                            <Edit2 className="size-3.5" />
                            <span>Edit</span>
                          </Button>
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

      {/* CREATE HOUSE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New House</DialogTitle>
            <DialogDescription>
              Register a residential or sports house for student allocation.
            </DialogDescription>
          </DialogHeader>
          <form action={createHouseAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">House Name *</Label>
              <Input
                id="create-name"
                name="name"
                placeholder="e.g. Kwame Nkrumah House"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-code">House Code</Label>
                <Input
                  id="create-code"
                  name="code"
                  placeholder="e.g. NKR"
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
                  Active for automatic student assignment
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

      {/* REBALANCE SIMULATION DIALOG */}
      <Dialog open={isRebalanceOpen} onOpenChange={setIsRebalanceOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="size-5 text-primary" />
              <span>Automated House Rebalancing Engine</span>
            </DialogTitle>
            <DialogDescription>
              Preview deterministic rebalancing to achieve equal male & female parity
              across active houses without exceeding capacities.
            </DialogDescription>
          </DialogHeader>

          {rebalancePlan && (
            <div className="space-y-4 text-xs">
              {rebalancePlan.isBalanced ? (
                <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                  <p>
                    All active houses are already in optimal balance! No student moves are required.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="size-4 text-amber-600" />
                      Rebalancing Plan: {rebalancePlan.totalMoves} student move{rebalancePlan.totalMoves === 1 ? "" : "s"} required
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      Executing this will immediately reassign students to minimize gender skew across houses while keeping all houses strictly within their bed limits.
                    </p>
                  </div>

                  {/* Proposed Distribution Comparison */}
                  <div>
                    <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px] mb-2">
                      Proposed Outcome vs Current
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left">
                        <thead className="bg-muted/40 text-[10px] text-muted-foreground uppercase">
                          <tr>
                            <th className="px-3 py-2">House</th>
                            <th className="px-3 py-2">Current (M / F / Total)</th>
                            <th className="px-3 py-2">Proposed (M / F / Total)</th>
                            <th className="px-3 py-2">Net Change</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {rebalancePlan.proposedDistribution.map((prop) => {
                            const curr = rebalancePlan.currentDistribution.find(
                              (c) => c.id === prop.id
                            );
                            const net = prop.totalCount - (curr?.totalCount ?? 0);
                            return (
                              <tr key={prop.id}>
                                <td className="px-3 py-2 font-medium">{prop.name}</td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {curr?.maleCount}M &bull; {curr?.femaleCount}F ({curr?.totalCount})
                                </td>
                                <td className="px-3 py-2 font-semibold">
                                  {prop.maleCount}M &bull; {prop.femaleCount}F ({prop.totalCount})
                                </td>
                                <td className="px-3 py-2">
                                  {net > 0 ? (
                                    <span className="text-emerald-700">+{net}</span>
                                  ) : net < 0 ? (
                                    <span className="text-destructive">{net}</span>
                                  ) : (
                                    <span className="text-muted-foreground">0</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Move Details List */}
                  {rebalancePlan.moves.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px] mb-2">
                        Proposed Student Transfers ({rebalancePlan.moves.length})
                      </h4>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                        {rebalancePlan.moves.map((move, idx) => (
                          <div
                            key={`${move.studentId}-${idx}`}
                            className="px-3 py-2 flex items-center justify-between text-xs hover:bg-muted/20"
                          >
                            <div>
                              <span className="font-semibold">{move.studentName}</span>
                              <span className="ml-2 capitalize text-muted-foreground">
                                ({move.gender})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-muted-foreground">
                                {move.fromHouseName}
                              </span>
                              <ArrowRight className="size-3 text-muted-foreground" />
                              <span className="text-primary font-semibold">
                                {move.toHouseName}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRebalanceOpen(false)}
            >
              Cancel
            </Button>
            {rebalancePlan && rebalancePlan.moves.length > 0 && (
              <Button
                type="button"
                onClick={handleExecuteRebalance}
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Executing Moves...</span>
                  </>
                ) : (
                  <>
                    <Scale className="size-4" />
                    <span>Confirm & Execute Rebalance ({rebalancePlan.totalMoves})</span>
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
