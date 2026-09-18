"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Users,
  ShieldCheck,
} from "lucide-react";
import {
  validateStudentImportAction,
  executeStudentImportAction,
  type RawImportRow,
  type ImportValidationSummary,
  type ImportExecutionResult,
} from "@/lib/actions/student-import";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CSV_HEADER =
  "jhs_index_number,first_name,middle_name,last_name,gender,date_of_birth,previous_school,region,district,parent_name,parent_relationship,parent_phone,parent_alt_phone,parent_email,parent_address,program,house,student_type,academic_year,semester,level,class,enrollment_status";

const SAMPLE_CSV = `${CSV_HEADER}
1010101001,Kwame,Kofi,Mensah,male,2008-05-12,Achimota Basic,Greater Accra,Accra Metro,Emmanuel Mensah,Father,0244123456,,,Darkuman Accra,General Arts,Abubakar,day,2026/2027,Semester 1,Form 1,1A,active
1010101002,Fatima,,Adam,female,2008-09-21,Madina Islamic JHS,Greater Accra,La Nkwantanang,Amina Adam,Mother,0209876543,,,Madina Zongo,General Science,Umar,boarding,2026/2027,Semester 1,Form 1,1B,active`;

export function StudentImportWizard() {
  const [step, setStep] = useState<number>(1);
  const [fileName, setFileName] = useState<string>("");
  const [importMode, setImportMode] = useState<"new_only" | "update_existing">("new_only");

  const [isPending, startTransition] = useTransition();
  const [houseAllocationMode, setHouseAllocationMode] = useState<"auto_balanced" | "csv_column" | "unassigned">("auto_balanced");
  const [validation, setValidation] = useState<ImportValidationSummary | null>(null);
  const [executionResult, setExecutionResult] = useState<ImportExecutionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Template Download Handler
  function handleDownloadTemplate() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "khulafasco_student_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // File Upload Handler
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseAndValidate(text);
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read the uploaded file.");
    };
    reader.readAsText(file);
  }

  // Parse CSV to objects and call server action
  function parseAndValidate(rawText: string) {
    setErrorMsg(null);
    const lines = rawText
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setErrorMsg("File contains no data rows. Make sure headers and data are present.");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const dataRows: RawImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Split by comma ignoring commas inside quotes
      const values: string[] = [];
      let inQuotes = false;
      let current = "";
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ""));

      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || "";
      });
      dataRows.push(rowObj as unknown as RawImportRow);
    }

    startTransition(async () => {
      try {
        const summary = await validateStudentImportAction(dataRows);
        setValidation(summary);
        setStep(3); // Advance to Validate/Preview
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Validation failed.");
      }
    });
  }

  // Execute Import
  function handleExecuteImport() {
    if (!validation || validation.validRows.length === 0) return;

    startTransition(async () => {
      try {
        const result = await executeStudentImportAction(validation.validRows, importMode, houseAllocationMode);
        setExecutionResult(result);
        setStep(6); // Result Report
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Import execution failed.");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Step Indicator Tracker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
            step === 1 ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"
          }`}
        >
          <span className="size-5 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">1</span>
          <span>Download Template</span>
        </div>

        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
            step === 2 ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"
          }`}
        >
          <span className="size-5 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">2</span>
          <span>Upload File</span>
        </div>

        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
            step === 3 || step === 4 ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"
          }`}
        >
          <span className="size-5 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">3</span>
          <span>Validate & Preview</span>
        </div>

        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
            step >= 5 ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground"
          }`}
        >
          <span className="size-5 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">4</span>
          <span>Confirm & Results</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-start gap-2">
          <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Import Error</p>
            <p className="text-xs mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* STEP 1: DOWNLOAD TEMPLATE */}
      {step === 1 && (
        <Card className="shadow-xs border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-6 text-primary" />
              <CardTitle className="text-lg">Step 1: Download Official Import Template</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To ensure data integrity, use the official Khulafasco CSV template with canonical columns and 10-digit JHS/BECE Index Number formatting.
            </p>

            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-2 text-xs">
              <p className="font-semibold text-foreground">Standard Supported Columns:</p>
              <code className="block p-2 rounded bg-background border text-[11px] overflow-x-auto text-muted-foreground font-mono">
                {CSV_HEADER}
              </code>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li><strong>jhs_index_number</strong>: Exactly 10 digits (e.g. 1010101001).</li>
                <li><strong>gender</strong>: &apos;male&apos; or &apos;female&apos;.</li>
                <li><strong>date_of_birth</strong>: YYYY-MM-DD format (e.g. 2008-05-12).</li>
                <li><strong>student_type</strong>: &apos;boarding&apos; or &apos;day&apos;.</li>
                <li><strong>program</strong>: Exact program name or code (e.g. General Arts, Business).</li>
                <li><strong>level</strong>: Form 1, Form 2, or Form 3.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button onClick={handleDownloadTemplate} size="sm">
                <Download className="size-4 mr-1.5" /> Download CSV Template
              </Button>
              <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                I Already Have a Completed File <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: UPLOAD FILE */}
      {step === 2 && (
        <Card className="shadow-xs border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UploadCloud className="size-6 text-primary" />
              <CardTitle className="text-lg">Step 2: Upload Student Data File</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select your populated CSV file. The system will parse and validate each record before anything is written to the database.
            </p>

            <label
              htmlFor="csvUpload"
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] transition-colors"
            >
              <UploadCloud className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm font-semibold text-foreground">
                {fileName ? fileName : "Click to browse or drag and drop your CSV file"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Supports standard CSV format (.csv)</p>
              <input
                id="csvUpload"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isPending}
              />
            </label>

            {isPending && (
              <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="size-4 animate-spin text-primary" /> Parsing and validating records...
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4 mr-1.5" /> Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: VALIDATE & PREVIEW */}
      {step === 3 && validation && (
        <div className="space-y-6">
          {/* Validation Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="shadow-xs">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Rows</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{validation.totalRows}</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-emerald-200 bg-emerald-50/40">
              <CardContent className="pt-4">
                <p className="text-xs text-emerald-800 uppercase font-semibold">Valid Records</p>
                <p className="text-2xl font-bold mt-1 text-emerald-700">{validation.validCount}</p>
              </CardContent>
            </Card>

            <Card className={`shadow-xs ${validation.invalidCount > 0 ? "border-red-200 bg-red-50/40" : ""}`}>
              <CardContent className="pt-4">
                <p className="text-xs text-red-800 uppercase font-semibold">Invalid Rows</p>
                <p className="text-2xl font-bold mt-1 text-red-700">{validation.invalidCount}</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Existing in DB</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">{validation.existingInDbCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Duplicate / Error Alerts */}
          {validation.duplicateIndicesInFile.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-amber-600" />
                Duplicate Index Numbers Detected in Uploaded File ({validation.duplicateIndicesInFile.length})
              </p>
              <p className="text-xs">
                Indices: {validation.duplicateIndicesInFile.join(", ")}. Duplicate rows must be corrected before full import.
              </p>
            </div>
          )}

          {/* Invalid Rows Table */}
          {validation.invalidCount > 0 && (
            <Card className="shadow-xs border-red-200">
              <CardHeader className="pb-3 border-b border-red-100 bg-red-50/50">
                <CardTitle className="text-sm font-semibold text-red-900 flex items-center gap-2">
                  <XCircle className="size-4 text-red-600" /> Errors Requiring Correction ({validation.invalidCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 divide-y divide-border/60 max-h-60 overflow-y-auto">
                {validation.invalidRows.map((inv) => (
                  <div key={inv.rowNumber} className="py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Row {inv.rowNumber}:</span>
                      <Badge variant="outline" className="text-[10px]">{inv.jhs_index_number}</Badge>
                      <span className="text-muted-foreground">{inv.raw.first_name} {inv.raw.last_name}</span>
                    </div>
                    <ul className="list-disc list-inside text-red-600 mt-1 space-y-0.5">
                      {inv.errors.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Valid Preview Table */}
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" /> Valid Student Records Ready for Import ({validation.validCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Index</th>
                      <th className="px-3 py-2">Full Name</th>
                      <th className="px-3 py-2">Gender</th>
                      <th className="px-3 py-2">Program</th>
                      <th className="px-3 py-2">Level</th>
                      <th className="px-3 py-2">Parent Contact</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {validation.validRows.map((r) => (
                      <tr key={r.rowNumber} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono font-semibold">{r.jhs_index_number}</td>
                        <td className="px-3 py-2">{r.first_name} {r.last_name}</td>
                        <td className="px-3 py-2 capitalize">{r.gender}</td>
                        <td className="px-3 py-2">{r.program_name}</td>
                        <td className="px-3 py-2">{r.level} {r.class_name ? `(${r.class_name})` : ""}</td>
                        <td className="px-3 py-2">{r.parent_name} ({r.parent_phone})</td>
                        <td className="px-3 py-2">
                          {r.isExisting ? (
                            <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 border-blue-200">
                              Existing Student
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                              New Admission
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Import Mode & Action Bar */}
          <Card className="shadow-xs border-border">
            <CardContent className="pt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Select Import Mode for Existing Students:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer ${
                      importMode === "new_only" ? "border-primary bg-primary/[0.03]" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="new_only"
                      checked={importMode === "new_only"}
                      onChange={() => setImportMode("new_only")}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">New Students Only</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Import only new students. Skip any record whose JHS Index already exists in the database.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer ${
                      importMode === "update_existing" ? "border-primary bg-primary/[0.03]" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="update_existing"
                      checked={importMode === "update_existing"}
                      onChange={() => setImportMode("update_existing")}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Update & Re-Enroll Existing</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Update existing profiles with new contact details and create academic enrollment records.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  House Allocation Strategy:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer ${
                      houseAllocationMode === "auto_balanced" ? "border-primary bg-primary/[0.03]" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="houseAllocationMode"
                      value="auto_balanced"
                      checked={houseAllocationMode === "auto_balanced"}
                      onChange={() => setHouseAllocationMode("auto_balanced")}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Auto-Balance (Recommended)</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Evenly balance male & female students across active houses respecting capacities.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer ${
                      houseAllocationMode === "csv_column" ? "border-primary bg-primary/[0.03]" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="houseAllocationMode"
                      value="csv_column"
                      checked={houseAllocationMode === "csv_column"}
                      onChange={() => setHouseAllocationMode("csv_column")}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Use CSV House Column</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Assign exactly the house name mapped from the imported file.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer ${
                      houseAllocationMode === "unassigned" ? "border-primary bg-primary/[0.03]" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="houseAllocationMode"
                      value="unassigned"
                      checked={houseAllocationMode === "unassigned"}
                      onChange={() => setHouseAllocationMode("unassigned")}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Leave Unassigned</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Enroll without house affiliation; assign houses manually later.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                  <ArrowLeft className="size-4 mr-1.5" /> Re-upload File
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteImport}
                  disabled={isPending || validation.validCount === 0}
                >
                  {isPending ? (
                    <>
                      <RefreshCw className="size-4 mr-1.5 animate-spin" /> Processing Import...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4 mr-1.5" /> Execute Import ({validation.validCount} Records)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 6: RESULT REPORT */}
      {step === 6 && executionResult && (
        <Card className="shadow-xs border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-6 text-emerald-600" />
              <CardTitle className="text-lg">Import Execution Completed</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Processed</p>
                <p className="text-xl font-bold text-foreground mt-1">{executionResult.totalProcessed}</p>
              </div>
              <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50">
                <p className="text-xs text-emerald-800 uppercase font-semibold">New Enrolled</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{executionResult.insertedCount}</p>
              </div>
              <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50">
                <p className="text-xs text-blue-800 uppercase font-semibold">Updated</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{executionResult.updatedCount}</p>
              </div>
              <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50">
                <p className="text-xs text-amber-800 uppercase font-semibold">Skipped</p>
                <p className="text-xl font-bold text-amber-700 mt-1">{executionResult.skippedCount}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{executionResult.message}</p>

            {executionResult.errors.length > 0 && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
                <p className="font-semibold">Row-level database errors encountered ({executionResult.errors.length}):</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {executionResult.errors.map((e, idx) => (
                    <li key={idx}>Row {e.row} ({e.index}): {e.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-3 pt-3 border-t border-border">
              <Button render={<Link href="/students" />} size="sm">
                <Users className="size-4 mr-1.5" /> View Students Directory
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep(1);
                  setValidation(null);
                  setExecutionResult(null);
                  setFileName("");
                }}
              >
                Import Another Batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
