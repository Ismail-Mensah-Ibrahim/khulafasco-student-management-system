"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Printer,
  Download,
  Phone,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import type { HouseDashboardData } from "@/lib/data";

interface HouseStudentsViewProps {
  data: HouseDashboardData;
  userRole?: string;
  userFullName?: string;
}

export function HouseStudentsView({
  data,
}: HouseStudentsViewProps) {
  const { house, isAssigned, students } = data;

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "boarding" | "day">("all");

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.jhsIndexNumber.toLowerCase().includes(q);

      const matchesGender =
        genderFilter === "all" || s.gender === genderFilter;

      const matchesType =
        typeFilter === "all" || s.studentType === typeFilter;

      return matchesSearch && matchesGender && matchesType;
    });
  }, [students, search, genderFilter, typeFilter]);

  function handleExportCSV() {
    if (!house) return;
    const headers = [
      "JHS_Index_Number",
      "Full_Name",
      "Gender",
      "House",
      "Program",
      "Student_Type",
      "Parent_Name",
      "Parent_Phone",
      "Status",
    ];

    const rows = filteredStudents.map((s) => [
      `"${s.jhsIndexNumber}"`,
      `"${s.fullName}"`,
      `"${s.gender}"`,
      `"${house.name}"`,
      `"${s.programName || "General"}"`,
      `"${s.studentType || "Boarding"}"`,
      `"${s.parentName || ""}"`,
      `"${s.parentPhone || ""}"`,
      `"${s.enrollmentStatus}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `house_${house.name.toLowerCase()}_students_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (!isAssigned || !house) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No residential house assigned to your profile. Please contact an administrator.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
            House {house.name} Student Roster
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Official residential roll call and student registry for House {house.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs gap-1.5"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs gap-1.5 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
          >
            <Printer className="size-3.5" />
            <span>Print Roll Call</span>
          </Button>
        </div>
      </div>

      {/* Main Roster Card */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search student or index number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-md text-xs">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground px-1.5">Gender:</span>
                <button
                  onClick={() => setGenderFilter("all")}
                  className={`px-2 py-0.5 rounded text-xs ${
                    genderFilter === "all" ? "bg-background font-bold shadow-xs text-foreground" : "text-muted-foreground"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setGenderFilter("male")}
                  className={`px-2 py-0.5 rounded text-xs ${
                    genderFilter === "male" ? "bg-background font-bold shadow-xs text-blue-700" : "text-muted-foreground"
                  }`}
                >
                  Boys
                </button>
                <button
                  onClick={() => setGenderFilter("female")}
                  className={`px-2 py-0.5 rounded text-xs ${
                    genderFilter === "female" ? "bg-background font-bold shadow-xs text-pink-700" : "text-muted-foreground"
                  }`}
                >
                  Girls
                </button>
              </div>

              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-md text-xs">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground px-1.5">Type:</span>
                <button
                  onClick={() => setTypeFilter("all")}
                  className={`px-2 py-0.5 rounded text-xs ${
                    typeFilter === "all" ? "bg-background font-bold shadow-xs text-foreground" : "text-muted-foreground"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setTypeFilter("boarding")}
                  className={`px-2 py-0.5 rounded text-xs ${
                    typeFilter === "boarding" ? "bg-background font-bold shadow-xs text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Boarding
                </button>
                <button
                  onClick={() => setTypeFilter("day")}
                  className={`px-2 py-0.5 rounded text-xs ${
                    typeFilter === "day" ? "bg-background font-bold shadow-xs text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Day
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 text-muted-foreground uppercase font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">JHS Index Number</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Residential Type</th>
                  <th className="px-4 py-3">Parent / Contact</th>
                  <th className="px-4 py-3 print:table-cell hidden">Roll Call Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No students found matching this criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 font-mono font-medium text-foreground">
                        {student.jhsIndexNumber}
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-muted-foreground">
                        {student.programName || "General"}
                      </td>
                      <td className="px-4 py-3 capitalize font-medium text-foreground">
                        {student.studentType || "Boarding"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="font-medium text-foreground">
                            {student.parentName || "—"}
                          </div>
                          {student.parentPhone && (
                            <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                              <Phone className="size-3" />
                              <span>{student.parentPhone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 print:table-cell hidden">
                        <div className="w-6 h-6 border border-black rounded inline-block" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
