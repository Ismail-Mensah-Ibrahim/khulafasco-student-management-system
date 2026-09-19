"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Trash2,
  KeyRound,
  Edit2,
  AlertTriangle,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
} from "lucide-react";
import {
  ROLE_LABELS,
  ROLES,
  type UserRole,
  HOUSE_RESPONSIBILITIES,
  HOUSE_RESPONSIBILITY_LABELS,
  type HouseResponsibility,
} from "@/config/constants";
import type { Profile, StaffDeletionSafety, House } from "@/types";
import {
  updateStaffRoleAction,
  toggleStaffActiveAction,
  safeDeleteStaffAction,
  updateStaffProfileAction,
  updateStaffEmailAction,
  initiateStaffPasswordResetAction,
  checkStaffSafetyAction,
} from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StaffManagementClientProps {
  initialStaffList: Profile[];
  currentUserId: string;
  houses?: House[];
}

export function StaffManagementClient({
  initialStaffList,
  currentUserId,
  houses = [],
}: StaffManagementClientProps) {
  const router = useRouter();
  const [staffList, setStaffList] = useState<Profile[]>(initialStaffList);
  const [prevInitialStaffList, setPrevInitialStaffList] = useState<Profile[]>(initialStaffList);

  if (initialStaffList !== prevInitialStaffList) {
    setPrevInitialStaffList(initialStaffList);
    setStaffList(initialStaffList);
  }

  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

  // Dialog states
  const [roleModalStaff, setRoleModalStaff] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("teacher");
  const [newResponsibility, setNewResponsibility] = useState<string>("");
  const [selectedHouseId, setSelectedHouseId] = useState<string>("");

  const [editModalStaff, setEditModalStaff] = useState<Profile | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [deleteModalStaff, setDeleteModalStaff] = useState<Profile | null>(null);
  const [safetyCheck, setSafetyCheck] = useState<StaffDeletionSafety | null>(null);
  const [checkingSafety, setCheckingSafety] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Filtering
  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch =
      staff.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (staff.email && staff.email.toLowerCase().includes(search.toLowerCase())) ||
      (staff.phone && staff.phone.includes(search));

    const matchesRole = selectedRole === "all" || staff.role === selectedRole;
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && staff.is_active) ||
      (selectedStatus === "inactive" && !staff.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Action Handlers
  function handleOpenRoleModal(staff: Profile) {
    setRoleModalStaff(staff);
    setNewRole(staff.role);
    setNewResponsibility(staff.house_responsibility || "");
    setSelectedHouseId(staff.house_id || "");
    setFeedback(null);
  }

  function handleSaveRole() {
    if (!roleModalStaff) return;
    const targetStaff = roleModalStaff;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("staff_id", targetStaff.id);
      formData.set("role", newRole);
      formData.set("house_responsibility", newResponsibility);
      formData.set("house_id", selectedHouseId || "");

      const result = await updateStaffRoleAction(formData);
      if (result.success) {
        setFeedback({ type: "success", message: result.message });
        setStaffList((prev) =>
          prev.map((s) =>
            s.id === targetStaff.id
              ? {
                  ...s,
                  role: newRole,
                  house_responsibility: (newResponsibility as HouseResponsibility) || null,
                  house_id: selectedHouseId || null,
                }
              : s
          )
        );
        setRoleModalStaff(null);
        router.refresh();
      } else {
        setFeedback({ type: "error", message: result.message });
      }
    });
  }

  function handleToggleActive(staff: Profile) {
    if (staff.id === currentUserId) {
      setFeedback({ type: "error", message: "You cannot deactivate your own account." });
      return;
    }

    const nextActive = !staff.is_active;
    const confirmMsg = nextActive
      ? `Activate staff account for ${staff.full_name}?`
      : `Deactivate staff account for ${staff.full_name}? They will not be able to log in.`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("staff_id", staff.id);
      formData.set("active", String(nextActive));

      const result = await toggleStaffActiveAction(formData);
      if (result.success) {
        setFeedback({ type: "success", message: result.message });
        setStaffList((prev) =>
          prev.map((s) => (s.id === staff.id ? { ...s, is_active: nextActive } : s))
        );
        router.refresh();
      } else {
        setFeedback({ type: "error", message: result.message });
      }
    });
  }

  function handleOpenEditModal(staff: Profile) {
    setEditModalStaff(staff);
    setEditFullName(staff.full_name);
    setEditPhone(staff.phone || "");
    setEditEmail(staff.email || "");
    setFeedback(null);
  }

  function handleSaveProfile() {
    if (!editModalStaff) return;
    const targetStaff = editModalStaff;
    const emailChanged = editEmail.trim().toLowerCase() !== (targetStaff.email || "").toLowerCase();

    startTransition(async () => {
      // 1. Update name + phone
      const formData = new FormData();
      formData.set("staff_id", targetStaff.id);
      formData.set("full_name", editFullName);
      formData.set("phone", editPhone);

      const result = await updateStaffProfileAction(formData);
      if (!result.success) {
        setFeedback({ type: "error", message: result.message });
        return;
      }

      // 2. Update email separately if changed
      if (emailChanged && editEmail.trim()) {
        const emailFormData = new FormData();
        emailFormData.set("staff_id", targetStaff.id);
        emailFormData.set("email", editEmail.trim());
        const emailResult = await updateStaffEmailAction(emailFormData);
        if (!emailResult.success) {
          setFeedback({ type: "error", message: "Profile saved, but email update failed: " + emailResult.message });
          setStaffList((prev) =>
            prev.map((s) =>
              s.id === targetStaff.id ? { ...s, full_name: editFullName, phone: editPhone || null } : s
            )
          );
          setEditModalStaff(null);
          router.refresh();
          return;
        }
      }

      setFeedback({ type: "success", message: emailChanged ? "Profile and email updated successfully." : result.message });
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === targetStaff.id
            ? { ...s, full_name: editFullName, phone: editPhone || null, email: editEmail || s.email }
            : s
        )
      );
      setEditModalStaff(null);
      router.refresh();
    });
  }

  async function handleOpenDeleteModal(staff: Profile) {
    if (staff.id === currentUserId) {
      setFeedback({ type: "error", message: "You cannot delete your own active administrator account." });
      return;
    }
    setDeleteModalStaff(staff);
    setDeleteConfirmText("");
    setCheckingSafety(true);
    setSafetyCheck(null);
    setFeedback(null);

    // Call server action to check safety
    try {
      const safety = await checkStaffSafetyAction(staff.id);
      setSafetyCheck(safety);
    } catch {
      setSafetyCheck({
        safe: false,
        total_references: 99,
        reasons: ["Unable to verify account references."],
        recommendation: "Deactivate account instead of permanent deletion.",
      });
    } finally {
      setCheckingSafety(false);
    }
  }

  function handleConfirmDelete() {
    if (!deleteModalStaff) return;
    const deletingStaff = deleteModalStaff;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("staff_id", deletingStaff.id);

      const result = await safeDeleteStaffAction(formData);
      if (result.success) {
        if ("warning" in result && result.warning) {
          setFeedback({ type: "warning", message: result.warning });
        } else {
          setFeedback({ type: "success", message: result.message });
        }
        setStaffList((prev) => prev.filter((s) => s.id !== deletingStaff.id));
        setDeleteModalStaff(null);
        router.refresh();
      } else {
        setFeedback({ type: "error", message: result.message });
      }
    });
  }

  function handleDispatchPasswordReset(staff: Profile) {
    const confirmMsg = `Send a secure password reset link to staff user "${staff.full_name}"?`;
    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      const formData = new FormData();
      // Use phone or lookup email via id or pass email if available
      formData.set("email", (staff as unknown as { email?: string }).email || `${staff.id}@khulafasco.edu.gh`);

      const result = await initiateStaffPasswordResetAction(formData);
      if (result.success) {
        setFeedback({ type: "success", message: result.message });
      } else {
        setFeedback({ type: "error", message: result.message });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Notification banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-lg border text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : feedback.type === "warning"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            ) : feedback.type === "warning" ? (
              <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            ) : (
              <XCircle className="size-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setFeedback(null)}
            className="text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}


      {/* Filter and Search Bar */}
      <Card className="shadow-xs border-border">
        <CardContent className="pt-4 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by name, email, or phone..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="size-4 text-muted-foreground shrink-0" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Roles ({ROLES.length})</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="inactive">Disabled Accounts</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Staff Directory Table */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              Faculty & Staff Directory ({filteredStaff.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStaff.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="size-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No staff members found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or role filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Institutional Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{staff.full_name}</span>
                            {staff.id === currentUserId && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                                You
                              </Badge>
                            )}
                          </div>
                          {staff.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="size-3 text-primary/70" /> {staff.email}
                            </p>
                          )}
                          {staff.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="size-3" /> {staff.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="outline" className="text-xs font-semibold">
                            {ROLE_LABELS[staff.role] ?? staff.role}
                          </Badge>
                          {staff.house_responsibility && (
                            <Badge
                              variant="secondary"
                              className="text-[11px] bg-primary/10 text-primary border-primary/20 font-medium px-2 py-0.5"
                            >
                              {HOUSE_RESPONSIBILITY_LABELS[staff.house_responsibility]}
                              {staff.house_id
                                ? ` (${houses.find((h) => h.id === staff.house_id)?.name || "House"})`
                                : " (All Houses)"}
                            </Badge>
                          )}
                          {!staff.house_responsibility && staff.house_id && (
                            <div className="text-[11px] text-muted-foreground font-medium">
                              House: {houses.find((h) => h.id === staff.house_id)?.name || "Assigned"}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={staff.is_active ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {staff.is_active ? "Active" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {new Date(staff.created_at).toLocaleDateString("en-GH", {
                          dateStyle: "medium",
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role Change */}
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleOpenRoleModal(staff)}
                            title="Reassign Role"
                            className="text-xs"
                          >
                            <Shield className="size-3.5 mr-1 text-primary" /> Role
                          </Button>

                          {/* Edit Profile */}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleOpenEditModal(staff)}
                            title="Edit Contact Profile"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>

                          {/* Password Reset Dispatch */}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleDispatchPasswordReset(staff)}
                            disabled={isPending}
                            title="Dispatch Password Reset"
                          >
                            <KeyRound className="size-3.5 text-muted-foreground" />
                          </Button>

                          {/* Activate / Deactivate Toggle */}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleToggleActive(staff)}
                            disabled={staff.id === currentUserId || isPending}
                            title={staff.is_active ? "Deactivate Account" : "Activate Account"}
                            className={staff.is_active ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"}
                          >
                            {staff.is_active ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                          </Button>

                          {/* Safe Delete */}
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleOpenDeleteModal(staff)}
                            disabled={staff.id === currentUserId || isPending}
                            title="Safe Account Deletion"
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1. ROLE REASSIGNMENT DIALOG */}
      <Dialog open={!!roleModalStaff} onOpenChange={(open) => !open && setRoleModalStaff(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" /> Reassign Staff Role
            </DialogTitle>
            <DialogDescription>
              Changing role for <strong>{roleModalStaff?.full_name}</strong> immediately alters system permissions, dashboards, and authorization boundaries.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Current Role
              </label>
              <Badge variant="outline" className="text-sm font-medium">
                {roleModalStaff ? ROLE_LABELS[roleModalStaff.role] : ""}
              </Badge>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Primary Employment Role *
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]} ({r})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Additional House Responsibility (Optional)
              </label>
              <select
                value={newResponsibility}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewResponsibility(val);
                  if (val === "senior_house_master" || val === "senior_house_mistress" || val === "") {
                    setSelectedHouseId("");
                  }
                }}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="">None (No Residential House Assignment)</option>
                <option value="house_master">House Master (Assigned House)</option>
                <option value="house_mistress">House Mistress (Assigned House)</option>
                <option value="senior_house_master">Senior House Master (School-wide Oversight - All Houses)</option>
                <option value="senior_house_mistress">Senior House Mistress (School-wide Oversight - All Houses)</option>
              </select>
            </div>

            {(newResponsibility === "house_master" ||
              newResponsibility === "house_mistress" ||
              newRole === "house_master" ||
              newRole === "house_mistress") && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Assign Residential House *
                </label>
                <select
                  value={selectedHouseId}
                  onChange={(e) => setSelectedHouseId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Choose House --</option>
                  {houses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.code || h.name.slice(0, 3).toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(newResponsibility === "senior_house_master" || newResponsibility === "senior_house_mistress") && (
              <div className="p-2.5 rounded-md bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                <p className="font-semibold">School-Wide House Oversight</p>
                <p className="mt-0.5 text-indigo-700">
                  Senior House Masters and Mistresses have administrative observation and exeat oversight across all 4 houses (Abubakar, Umar, Uthman, Ali).
                </p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="size-4 shrink-0 text-amber-600" /> Authoritative Security Notice
              </p>
              <p className="mt-1">
                This modification is written directly to authoritative database records and logged in the Security Audit Center.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setRoleModalStaff(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveRole}
              loading={isPending}
              loadingText="Updating Role..."
              disabled={
                isPending ||
                (newRole === roleModalStaff?.role &&
                  newResponsibility === (roleModalStaff?.house_responsibility || "") &&
                  selectedHouseId === (roleModalStaff?.house_id || ""))
              }
            >
              Confirm Role Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. EDIT PROFILE DIALOG */}
      <Dialog open={!!editModalStaff} onOpenChange={(open) => !open && setEditModalStaff(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-5 text-primary" /> Edit Staff Profile
            </DialogTitle>
            <DialogDescription>
              Update staff name, phone, and email address. Email changes update the login credential immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Full Name
              </label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="e.g. Ibrahim Mensah"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Email Address <span className="text-primary">(Login Credential)</span>
              </label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="e.g. staff@khulafasco.edu.gh"
              />
              {editEmail.trim().toLowerCase() !== (editModalStaff?.email || "").toLowerCase() && editEmail.trim() && (
                <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                  <AlertTriangle className="size-3 shrink-0" />
                  Email will be updated in the authentication system. Inform the staff member of their new login email.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Phone Number
              </label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="e.g. 0244123456"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEditModalStaff(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveProfile} loading={isPending} loadingText="Saving..." disabled={isPending || !editFullName.trim()}>
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* 3. SAFE PERMANENT DELETION DIALOG */}
      <Dialog open={!!deleteModalStaff} onOpenChange={(open) => !open && setDeleteModalStaff(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Permanent Account Deletion
            </DialogTitle>
            <DialogDescription>
              Checking historical institutional dependencies for <strong>{deleteModalStaff?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {checkingSafety ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Auditing foreign key references...
              </div>
            ) : safetyCheck && !safetyCheck.safe ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  <p className="font-semibold flex items-center gap-2 text-red-900">
                    <XCircle className="size-5 shrink-0 text-red-600" />
                    Permanent Deletion Blocked
                  </p>
                  <p className="text-xs mt-1">
                    This staff account is referenced by <strong>{safetyCheck.total_references}</strong> protected institutional record(s):
                  </p>
                  <ul className="list-disc list-inside text-xs mt-2 space-y-0.5">
                    {safetyCheck.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Recommendation:</strong> To maintain institutional compliance and historical integrity, deactivate this account instead of permanently deleting it.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                  <p className="font-semibold flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                    Zero Historical References Detected
                  </p>
                  <p className="text-xs mt-1">
                    This account has no linked audit logs, receipts, requests, attendance records, or results. Permanent deletion is technically safe.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Type <strong>DELETE</strong> to confirm:
                  </label>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="text-sm font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeleteModalStaff(null)}>
              Close
            </Button>
            {safetyCheck && !safetyCheck.safe ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (deleteModalStaff) {
                    handleToggleActive(deleteModalStaff);
                    setDeleteModalStaff(null);
                  }
                }}
              >
                Deactivate Account Instead
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                loading={isPending}
                loadingText="Deleting..."
                disabled={isPending || deleteConfirmText !== "DELETE" || checkingSafety}
              >
                Permanently Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
