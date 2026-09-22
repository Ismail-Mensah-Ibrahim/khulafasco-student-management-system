"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Home,
  Users,
  ClipboardList,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import type { HouseDashboardData } from "@/lib/data";
import type { House } from "@/types";
import { returnHouseExeatAction } from "@/lib/actions/house";
import { notifyError, notifySuccess } from "@/components/ui/toast";

interface HouseDashboardViewProps {
  data: HouseDashboardData;
  userRole: string;
  userFullName: string;
  allHouses?: House[];
  selectedHouseId?: string;
}

export function HouseDashboardView({
  data,
  userRole,
  userFullName,
  allHouses = [],
}: HouseDashboardViewProps) {
  const [isPending, startTransition] = useTransition();

  const {
    house,
    isAssigned,
    totalStudents,
    maleCount,
    femaleCount,
    boardingCount,
    dayCount,
    capacity,
    occupancyPercent,
    houseMaster,
    houseMistress,
    students,
    activeExeatsCount,
    recentExeats,
  } = data;

  const roleLabel =
    userRole === "house_master"
      ? "House Master"
      : userRole === "house_mistress"
      ? "House Mistress"
      : "System Administrator";

  function handleMarkReturned(exeatId: string) {
    startTransition(async () => {
      const res = await returnHouseExeatAction(exeatId);
      if (res.success) {
        notifySuccess(res.message || "Student marked as returned.");
      } else {
        notifyError(res.error || "Failed to update exeat.");
      }
    });
  }

  if (!isAssigned || !house) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">
            Residential House Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, <strong>{userFullName}</strong> ({roleLabel}).
          </p>
        </div>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6 pb-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
              <Home className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-amber-900">
              No Residential House Assigned
            </h2>
            <p className="text-sm text-amber-800 max-w-md mx-auto">
              Your profile has not yet been linked to a specific residential house (Abubakar, Ali, Umar, or Uthman). Please notify the System Administrator or Headmaster to assign your residential house affiliation.
            </p>
            {allHouses.length > 0 && (
              <div className="pt-4 flex flex-wrap justify-center gap-2">
                <span className="text-xs text-muted-foreground self-center mr-2">Admin View House:</span>
                {allHouses.map((h) => (
                  <Link
                    key={h.id}
                    href={`/house/dashboard?houseId=${h.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90"
                  >
                    {h.name}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with House Switcher for Admin + Senior House Staff */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold font-serif text-foreground">
              House {house.name}
            </h1>
            <Badge variant="outline" className="font-mono text-xs uppercase px-2 py-0.5 bg-primary/10 text-primary border-primary/30">
              {house.code || house.name.slice(0, 3).toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, <strong>{userFullName}</strong> · <span className="capitalize">{roleLabel}</span>
          </p>
        </div>

        {allHouses.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Scope:</span>
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border flex-wrap">
              <Link
                href="/house/dashboard?houseId=all"
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
                    href={`/house/dashboard?houseId=${h.id}`}
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
      </div>


      {/* KPI Stats Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Total Residents</span>
              <Users className="size-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{totalStudents}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Cap: {capacity} ({occupancyPercent}% full)
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-blue-700">Boys</span>
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-800">{maleCount}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {totalStudents > 0 ? Math.round((maleCount / totalStudents) * 100) : 0}% of house
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-pink-700">Girls</span>
              <div className="w-2 h-2 rounded-full bg-pink-500" />
            </div>
            <div className="text-2xl font-bold text-pink-800">{femaleCount}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100) : 0}% of house
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Boarding / Day</span>
              <Home className="size-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-foreground">{boardingCount}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {dayCount} day student{dayCount === 1 ? "" : "s"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-amber-700">On Exeat</span>
              <ClipboardList className="size-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-800">{activeExeatsCount}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {activeExeatsCount === 0 ? "All in residence" : "Signed permission leave"}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* House Leadership & Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Leadership Card */}
        <Card className="border-border shadow-xs md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <span>House Leadership & Supervision</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Designated residential officers overseeing discipline, welfare, and student roll calls.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  House Master
                </span>
                <div className="font-semibold text-sm text-foreground">
                  {houseMaster?.full_name || "Unassigned"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {houseMaster?.phone || "No phone listed"}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/20">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  House Mistress
                </span>
                <div className="font-semibold text-sm text-foreground">
                  {houseMistress?.full_name || "Unassigned"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {houseMistress?.phone || "No phone listed"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Operations Bar */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">House Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Link
              href="/house/students"
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-xs font-semibold text-foreground"
            >
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span>Full House Roster</span>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground" />
            </Link>

            <Link
              href="/house/exeats"
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-xs font-semibold text-foreground"
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-amber-600" />
                <span>Exeat Slips & Leave</span>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground" />
            </Link>

            <Link
              href="/requests/new"
              className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-xs font-semibold text-foreground"
            >
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-emerald-600" />
                <span>Hostel Supplies Request</span>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Active Exeats Section */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="size-4 text-amber-600" />
              <span>Current Leave of Absence (Active Exeats)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Students currently on approved leave outside the school hostel.
            </CardDescription>
          </div>
          <Link
            href="/house/exeats"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Manage All Exeats
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentExeats.filter((e) => e.status === "active").length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="size-6 text-emerald-600 mx-auto mb-1.5 opacity-80" />
              All house students are currently accounted for in residence.
            </div>
          ) : (
            <div className="divide-y divide-border overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">Reason</th>
                    <th className="px-4 py-2.5">Departure</th>
                    <th className="px-4 py-2.5">Expected Return</th>
                    <th className="px-4 py-2.5">Parent Contacted</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentExeats
                    .filter((e) => e.status === "active")
                    .map((exeat) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const s = exeat.student as any;
                      return (
                        <tr key={exeat.id} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
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
                          <td className="px-4 py-2.5 max-w-xs truncate text-muted-foreground">
                            {exeat.reason}
                          </td>
                          <td className="px-4 py-2.5">{exeat.departure_date}</td>
                          <td className="px-4 py-2.5 font-medium text-amber-800">
                            {exeat.expected_return_date}
                          </td>
                          <td className="px-4 py-2.5">
                            {exeat.parent_contacted ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                Contacted
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
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

      {/* House Roster Preview */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <span>Assigned Students Roster ({students.length})</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Students officially residing in House {house.name}.
            </CardDescription>
          </div>
          <Link
            href="/house/students"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>Full Roster & Roll Call</span>
            <ExternalLink className="size-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Index Number</th>
                  <th className="px-4 py-2.5">Gender</th>
                  <th className="px-4 py-2.5">Program</th>
                  <th className="px-4 py-2.5">Residential Type</th>
                  <th className="px-4 py-2.5">Emergency Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <StudentAvatar
                          jhsIndexNumber={student.jhsIndexNumber}
                          firstName={student.firstName || student.fullName.split(" ")[0]}
                          lastName={student.lastName || student.fullName.split(" ").slice(1).join(" ")}
                          photoPath={student.photoPath}
                          size="sm"
                        />
                        <span className="font-semibold text-foreground">{student.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">
                      {student.jhsIndexNumber}
                    </td>
                    <td className="px-4 py-2.5">
                      {student.gender === "male" ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                          Male
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 text-[10px]">
                          Female
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {student.programName || "General"}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-foreground font-medium">
                      {student.studentType || "Boarding"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {student.parentPhone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="size-3 text-muted-foreground" />
                          <span>{student.parentPhone}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
