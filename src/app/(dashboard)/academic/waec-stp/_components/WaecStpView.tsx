"use client";

import { useState } from "react";
import {
  ExternalLink,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  BookOpen,
  HelpCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WaecStpCandidate } from "@/lib/data";

interface WaecStpViewProps {
  candidates: WaecStpCandidate[];
}

export function WaecStpView({ candidates }: WaecStpViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "ready" | "attention">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const total = candidates.length;
  const readyCount = candidates.filter((c) => c.isStpReady).length;
  const attentionCount = total - readyCount;
  const readinessPercent = total > 0 ? Math.round((readyCount / total) * 100) : 0;

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    if (activeTab === "ready" && !c.isStpReady) return false;
    if (activeTab === "attention" && c.isStpReady) return false;

    if (search) {
      const q = search.toLowerCase();
      const matchIndex = c.jhs_index_number?.toLowerCase().includes(q);
      const matchName = c.fullName?.toLowerCase().includes(q);
      const matchProg = c.programName?.toLowerCase().includes(q);
      return matchIndex || matchName || matchProg;
    }

    return true;
  });

  // Export CSV formatted for WAEC STP Portal
  function handleExportCsv() {
    const headers = [
      "JHS_Index_Number",
      "First_Name",
      "Last_Name",
      "Gender",
      "Date_Of_Birth",
      "Program_Code",
      "House",
      "Assessments_Count",
      "STP_Readiness_Status",
      "Missing_Requirements",
    ];

    const rows = candidates.map((c) => [
      `"${c.jhs_index_number}"`,
      `"${c.firstName}"`,
      `"${c.lastName}"`,
      `"${c.gender}"`,
      `"${c.dateOfBirth || ""}"`,
      `"${c.programCode || c.programName || ""}"`,
      `"${c.houseName || ""}"`,
      c.resultsCount,
      `"${c.isStpReady ? "READY" : "INCOMPLETE"}"`,
      `"${c.missingRequirements.join("; ")}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `khulafasco_waec_stp_readiness_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* WAEC Official External Portal Card */}
      <Card className="border-primary/30 bg-primary/[0.02] shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <FileCheck className="size-5 text-primary" />
                <h3 className="font-semibold text-foreground text-base">
                  Official WAEC Student Transfer Process (STP) Portal
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Log in to the West African Examinations Council (WAEC) official STP Portal to submit, verify, and validate national candidate transfers between accredited Senior High Schools in Ghana.
              </p>
              <p className="text-[11px] text-primary/80 font-mono">
                Official Gateway: https://stpshs.waecgh.org/
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGuide(!showGuide)}
                className="gap-1.5 text-xs"
              >
                <HelpCircle className="size-3.5" />
                <span>{showGuide ? "Hide User Guide" : "STP Guidelines"}</span>
              </Button>
              <a
                href="https://stpshs.waecgh.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="gap-1.5 text-xs bg-primary">
                  <span>Open WAEC Portal</span>
                  <ExternalLink className="size-3.5" />
                </Button>
              </a>
            </div>
          </div>

          {/* Guidelines Accordion */}
          {showGuide && (
            <div className="mt-4 pt-4 border-t border-border/80 space-y-3 text-xs text-muted-foreground animate-in fade-in-50">
              <h4 className="font-semibold text-foreground">WAEC STP Compliance Rules & Protocol:</h4>
              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-foreground">Canonical Index Number:</strong> Each candidate must retain their permanent 10-digit JHS/BECE Index Number without exception.
                </li>
                <li>
                  <strong className="text-foreground">Continuous Assessment (SBA 30% / Exam 70%):</strong> Prior to issuing a WAEC transfer slip, terminal assessments must be fully entered and computed using the official 30/70 formula.
                </li>
                <li>
                  <strong className="text-foreground">Letter Grading Standards:</strong> Grades must strictly follow the WAEC SHS grading scale: A1 (80-100), B2 (70-79), B3 (65-69), C4 (60-64), C5 (55-59), C6 (50-54), D7 (45-49), E8 (40-44), F9 (0-39).
                </li>
                <li>
                  <strong className="text-foreground">Dual Transfer Lifecycle:</strong> Complete the internal institutional clearances (Academic Head, Finance Officer, Headmaster) on Khulafasco SMS before finalizing the student on the national WAEC portal.
                </li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Readiness Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Enrolled Candidates
            </CardTitle>
            <BookOpen className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active candidates monitored
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              100% STP Ready
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{readyCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Compliant with all 6 WAEC portal criteria
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Attention Required
            </CardTitle>
            <AlertTriangle className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{attentionCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Missing biodata or continuous assessments
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Compliance Rate
            </CardTitle>
            <FileCheck className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readinessPercent}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {readyCount} of {total} portal export ready
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Export Action Bar */}
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
            All Candidates ({total})
          </button>
          <button
            onClick={() => setActiveTab("ready")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "ready"
                ? "bg-background shadow-xs text-emerald-800 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            STP Ready ({readyCount})
          </button>
          <button
            onClick={() => setActiveTab("attention")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "attention"
                ? "bg-background shadow-xs text-amber-800 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Attention Needed ({attentionCount})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search index, name, program..."
              className="pl-9 text-xs h-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs shrink-0"
          >
            <Download className="size-3.5" />
            <span>Export WAEC CSV</span>
          </Button>
        </div>
      </div>

      {/* Candidate Readiness Checklist Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">JHS Index</th>
                  <th className="px-4 py-3">Candidate Name</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3 text-center">10-Digit Index</th>
                  <th className="px-4 py-3 text-center">Biodata</th>
                  <th className="px-4 py-3 text-center">Assessments (30/70)</th>
                  <th className="px-4 py-3 text-center">WAEC Grades</th>
                  <th className="px-4 py-3 text-center">STP Status</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No candidates found matching the active filter.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => {
                    const isExpanded = expandedId === c.id;

                    return (
                      <>
                        <tr key={c.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono font-semibold text-foreground">
                            {c.jhs_index_number}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground">{c.fullName}</p>
                            <p className="text-muted-foreground text-[11px] capitalize">
                              {c.gender} &bull; DOB: {c.dateOfBirth || "Missing"}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {c.programName || "Unassigned"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {c.hasValidIndex ? (
                              <CheckCircle2 className="size-4 text-emerald-600 inline" />
                            ) : (
                              <XCircle className="size-4 text-destructive inline" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {c.hasFullBiodata ? (
                              <CheckCircle2 className="size-4 text-emerald-600 inline" />
                            ) : (
                              <XCircle className="size-4 text-amber-500 inline" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {c.hasContinuousAssessment ? (
                              <span className="text-emerald-700 font-semibold">
                                {c.resultsCount} recorded
                              </span>
                            ) : (
                              <span className="text-amber-600">
                                {c.resultsCount > 0 ? "Partial" : "None"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {c.hasValidLetterGrades ? (
                              <Badge
                                variant="outline"
                                className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px]"
                              >
                                A1 &ndash; F9
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {c.isStpReady ? (
                              <Badge
                                variant="outline"
                                className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px] font-semibold"
                              >
                                Ready
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-amber-700 bg-amber-50 border-amber-200 text-[10px]"
                              >
                                Missing Info
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedId(isExpanded ? null : c.id)}
                              className="h-7 text-xs gap-1"
                            >
                              <span>{isExpanded ? "Hide" : "Review"}</span>
                              {isExpanded ? (
                                <ChevronUp className="size-3" />
                              ) : (
                                <ChevronDown className="size-3" />
                              )}
                            </Button>
                          </td>
                        </tr>

                        {/* Expanded Requirement Inspection Drawer */}
                        {isExpanded && (
                          <tr key={`${c.id}-expanded`} className="bg-muted/30">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="space-y-3">
                                <h5 className="font-semibold text-foreground text-xs uppercase tracking-wider">
                                  WAEC STP Candidate Verification Checklist
                                </h5>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  <div
                                    className={`p-3 rounded-lg border text-xs ${
                                      c.hasValidIndex
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                        : "border-destructive/30 bg-destructive/10 text-destructive"
                                    }`}
                                  >
                                    <p className="font-semibold">10-Digit Index Number</p>
                                    <p className="text-[11px] mt-0.5">
                                      {c.hasValidIndex
                                        ? "Valid Ghana BECE index format"
                                        : "Must be exactly 10 digits"}
                                    </p>
                                  </div>

                                  <div
                                    className={`p-3 rounded-lg border text-xs ${
                                      c.hasFullBiodata
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                        : "border-amber-200 bg-amber-50 text-amber-900"
                                    }`}
                                  >
                                    <p className="font-semibold">Candidate Biodata</p>
                                    <p className="text-[11px] mt-0.5">
                                      {c.hasFullBiodata
                                        ? "Name, Gender & DOB recorded"
                                        : "Missing Date of Birth"}
                                    </p>
                                  </div>

                                  <div
                                    className={`p-3 rounded-lg border text-xs ${
                                      c.hasProgram
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                        : "border-amber-200 bg-amber-50 text-amber-900"
                                    }`}
                                  >
                                    <p className="font-semibold">Academic Program</p>
                                    <p className="text-[11px] mt-0.5">
                                      {c.hasProgram
                                        ? `${c.programName} (${c.programCode || "SHS"})`
                                        : "No academic program"}
                                    </p>
                                  </div>

                                  <div
                                    className={`p-3 rounded-lg border text-xs ${
                                      c.hasContinuousAssessment
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                        : "border-amber-200 bg-amber-50 text-amber-900"
                                    }`}
                                  >
                                    <p className="font-semibold">Continuous Assessment 30/70</p>
                                    <p className="text-[11px] mt-0.5">
                                      {c.hasContinuousAssessment
                                        ? "30% Class & 70% Exam scores recorded"
                                        : "Scores pending entry"}
                                    </p>
                                  </div>

                                  <div
                                    className={`p-3 rounded-lg border text-xs ${
                                      c.hasValidLetterGrades
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                        : "border-amber-200 bg-amber-50 text-amber-900"
                                    }`}
                                  >
                                    <p className="font-semibold">Standard WAEC Grades</p>
                                    <p className="text-[11px] mt-0.5">
                                      {c.hasValidLetterGrades
                                        ? "Scale A1 to F9 verified"
                                        : "Scores not converted to WAEC grades"}
                                    </p>
                                  </div>

                                  <div
                                    className={`p-3 rounded-lg border text-xs ${
                                      c.hasQualitativeRemarks
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                        : "border-border bg-card text-muted-foreground"
                                    }`}
                                  >
                                    <p className="font-semibold">Qualitative Remarks</p>
                                    <p className="text-[11px] mt-0.5">
                                      {c.hasQualitativeRemarks
                                        ? "Teacher conduct & remarks recorded"
                                        : "Optional remarks pending"}
                                    </p>
                                  </div>
                                </div>

                                {c.missingRequirements.length > 0 && (
                                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                                    <p className="font-semibold">Action Required for STP Readiness:</p>
                                    <ul className="list-disc list-inside mt-1 text-[11px] space-y-0.5">
                                      {c.missingRequirements.map((req, idx) => (
                                        <li key={idx}>{req}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
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
