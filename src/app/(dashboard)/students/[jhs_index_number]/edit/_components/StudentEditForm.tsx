"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, UploadCloud, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BOARDING_TYPES,
  ENROLLMENT_STATUSES,
  GENDERS,
  GENDER_LABELS,
  GUARDIAN_RELATIONSHIPS,
} from "@/config/constants";
import { updateStudentAction, type UpdateStudentState } from "@/lib/actions/students";
import { StudentPhotoCapture } from "@/components/shared/StudentPhotoCapture";
import type { AcademicYear, House, Program, Student } from "@/types";


interface StudentEditFormProps {
  student: Student;
  academicYears: AcademicYear[];
  programs: Program[];
  houses: House[];
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending} className="min-w-44">
      {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
      {pending ? "Saving Changes..." : "Save Student Profile"}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function StudentEditForm({
  student,
  academicYears,
  programs,
  houses,
}: StudentEditFormProps) {
  const [state, formAction] = useActionState<UpdateStudentState, FormData>(
    updateStudentAction,
    undefined
  );

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [directUploading, setDirectUploading] = useState(false);
  const [directSuccessMessage, setDirectSuccessMessage] = useState<string | null>(null);

  const fieldErrors = state && !state.success ? state.fieldErrors ?? {} : {};
  const errorFor = (name: string) => fieldErrors[name]?.[0];

  useEffect(() => {
    if (!state?.success) return;
    if (!selectedPhoto) return;

    let cancelled = false;
    const uploadPhoto = async () => {
      setUploadStatus("uploading");
      const formData = new FormData();
      formData.append("studentId", state.studentId || student.id);
      formData.append("photo", selectedPhoto);

      try {
        const response = await fetch("/api/student-photo/upload", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { error?: string; success?: boolean };
        if (!response.ok || !result.success) {
          throw new Error(result.error ?? "Unable to upload the student photo.");
        }
        if (!cancelled) setUploadStatus("success");
      } catch (error) {
        if (!cancelled) {
          setPhotoError(error instanceof Error ? error.message : "Unable to upload the student photo.");
          setUploadStatus("error");
        }
      }
    };

    void uploadPhoto();
    return () => {
      cancelled = true;
    };
  }, [selectedPhoto, state, student.id]);

  const handleDirectUpload = async () => {
    if (!selectedPhoto) return;
    setDirectUploading(true);
    setPhotoError(null);
    setDirectSuccessMessage(null);

    const formData = new FormData();
    formData.append("studentId", student.id);
    formData.append("photo", selectedPhoto);

    try {
      const response = await fetch("/api/student-photo/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { error?: string; success?: boolean };
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Unable to upload the student photo.");
      }
      setDirectSuccessMessage("Photograph uploaded and updated successfully!");
      setSelectedPhoto(null);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Unable to upload the student photo.");
    } finally {
      setDirectUploading(false);
    }
  };


  return (
    <form action={formAction} className="space-y-8">
      {state && !state.success ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">{state.message}</p>
        </div>
      ) : null}

      {state?.success ? (
        <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Student profile updated successfully!</p>
            {uploadStatus === "uploading" ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading new photograph...
              </p>
            ) : uploadStatus === "success" ? (
              <p className="text-xs">Photograph updated successfully.</p>
            ) : uploadStatus === "error" ? (
              <p className="text-xs text-destructive">{photoError ?? "Failed to upload photo."}</p>
            ) : null}
            <div className="pt-2">
              <Link
                href={`/students/${encodeURIComponent(student.jhs_index_number)}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Return to Student Details
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Hidden canonical index number */}
      <input type="hidden" name="jhs_index_number" value={student.jhs_index_number} />

      {/* Section 1: Student Identity & Biodata */}
      <section className="rounded-xl border p-5 md:p-6 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            1. Student Identity & Biodata
          </h3>
          <p className="text-xs text-muted-foreground">
            Basic personal information and permanent identifier.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="jhs_index_number_display">JHS / BECE Index Number</Label>
            <Input
              id="jhs_index_number_display"
              value={student.jhs_index_number}
              disabled
              className="bg-muted font-mono"
            />
            <p className="text-xs text-muted-foreground">Canonical identifier (read-only).</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              name="first_name"
              defaultValue={student.first_name}
              required
              aria-invalid={Boolean(errorFor("first_name"))}
            />
            <FieldError message={errorFor("first_name")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="middle_name">Middle Name</Label>
            <Input
              id="middle_name"
              name="middle_name"
              defaultValue={student.middle_name ?? ""}
              aria-invalid={Boolean(errorFor("middle_name"))}
            />
            <FieldError message={errorFor("middle_name")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              name="last_name"
              defaultValue={student.last_name}
              required
              aria-invalid={Boolean(errorFor("last_name"))}
            />
            <FieldError message={errorFor("last_name")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender *</Label>
            <select
              id="gender"
              name="gender"
              defaultValue={student.gender}
              required
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {GENDER_LABELS[gender]}
                </option>
              ))}
            </select>
            <FieldError message={errorFor("gender")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth *</Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              defaultValue={student.date_of_birth}
              required
              aria-invalid={Boolean(errorFor("date_of_birth"))}
            />
            <FieldError message={errorFor("date_of_birth")} />
          </div>
        </div>
      </section>

      {/* Section 2: Academic & Placement */}
      <section className="rounded-xl border p-5 md:p-6 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            2. Academic & Placement
          </h3>
          <p className="text-xs text-muted-foreground">
            Program of study, residential status, house, and academic year.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="program_id">Program *</Label>
            <select
              id="program_id"
              name="program_id"
              defaultValue={student.program_id}
              required
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} ({program.code})
                </option>
              ))}
            </select>
            <FieldError message={errorFor("program_id")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="house_id">House</Label>
            <select
              id="house_id"
              name="house_id"
              defaultValue={student.house_id ?? ""}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">No house allocated</option>
              {houses.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.name}
                </option>
              ))}
            </select>
            <FieldError message={errorFor("house_id")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student_type">Student Type *</Label>
            <select
              id="student_type"
              name="student_type"
              defaultValue={student.student_type}
              required
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 capitalize"
            >
              {BOARDING_TYPES.map((type) => (
                <option key={type} value={type} className="capitalize">
                  {type === "boarding" ? "Boarding" : "Day"}
                </option>
              ))}
            </select>
            <FieldError message={errorFor("student_type")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="academic_year_id">Academic Year *</Label>
            <select
              id="academic_year_id"
              name="academic_year_id"
              defaultValue={student.academic_year_id}
              required
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name} {year.is_current ? "(Current)" : ""}
                </option>
              ))}
            </select>
            <FieldError message={errorFor("academic_year_id")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="enrollment_status">Enrollment Status *</Label>
            <select
              id="enrollment_status"
              name="enrollment_status"
              defaultValue={student.enrollment_status}
              required
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 capitalize"
            >
              {ENROLLMENT_STATUSES.map((status) => (
                <option key={status} value={status} className="capitalize">
                  {status}
                </option>
              ))}
            </select>
            <FieldError message={errorFor("enrollment_status")} />
          </div>
        </div>
      </section>

      {/* Section 3: Location & Previous School */}
      <section className="rounded-xl border p-5 md:p-6 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            3. Location & Previous School
          </h3>
          <p className="text-xs text-muted-foreground">
            Previous Junior High School attended and regional origins.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="previous_school">Previous School (JHS)</Label>
            <Input
              id="previous_school"
              name="previous_school"
              defaultValue={student.previous_school ?? ""}
              aria-invalid={Boolean(errorFor("previous_school"))}
            />
            <FieldError message={errorFor("previous_school")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input
              id="region"
              name="region"
              defaultValue={student.region ?? ""}
              aria-invalid={Boolean(errorFor("region"))}
            />
            <FieldError message={errorFor("region")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <Input
              id="district"
              name="district"
              defaultValue={student.district ?? ""}
              aria-invalid={Boolean(errorFor("district"))}
            />
            <FieldError message={errorFor("district")} />
          </div>
        </div>
      </section>

      {/* Section 4: Parent / Guardian Details */}
      <section className="rounded-xl border p-5 md:p-6 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            4. Parent / Guardian Details
          </h3>
          <p className="text-xs text-muted-foreground">
            Contact information for student&apos;s primary guardian.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="parent_name">Parent / Guardian Name *</Label>
            <Input
              id="parent_name"
              name="parent_name"
              defaultValue={student.parent_name}
              required
              aria-invalid={Boolean(errorFor("parent_name"))}
            />
            <FieldError message={errorFor("parent_name")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_relationship">Relationship *</Label>
            <select
              id="parent_relationship"
              name="parent_relationship"
              defaultValue={student.parent_relationship}
              required
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {GUARDIAN_RELATIONSHIPS.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
            <FieldError message={errorFor("parent_relationship")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_phone">Primary Phone *</Label>
            <Input
              id="parent_phone"
              name="parent_phone"
              defaultValue={student.parent_phone}
              required
              aria-invalid={Boolean(errorFor("parent_phone"))}
            />
            <FieldError message={errorFor("parent_phone")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_alt_phone">Alternative Phone</Label>
            <Input
              id="parent_alt_phone"
              name="parent_alt_phone"
              defaultValue={student.parent_alt_phone ?? ""}
              aria-invalid={Boolean(errorFor("parent_alt_phone"))}
            />
            <FieldError message={errorFor("parent_alt_phone")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_email">Email Address</Label>
            <Input
              id="parent_email"
              name="parent_email"
              type="email"
              defaultValue={student.parent_email ?? ""}
              aria-invalid={Boolean(errorFor("parent_email"))}
            />
            <FieldError message={errorFor("parent_email")} />
          </div>

          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Label htmlFor="parent_address">Residential Address</Label>
            <Textarea
              id="parent_address"
              name="parent_address"
              defaultValue={student.parent_address ?? ""}
              rows={2}
              aria-invalid={Boolean(errorFor("parent_address"))}
            />
            <FieldError message={errorFor("parent_address")} />
          </div>
        </div>
      </section>

      {/* Section 5: Student Photograph */}
      <section className="rounded-xl border p-5 md:p-6 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            5. Student Photograph
          </h3>
          <p className="text-xs text-muted-foreground">
            Scan with camera, take a live photo, or upload an image file (JPEG, PNG, or WebP, up to 5 MB).
          </p>
        </div>

        <StudentPhotoCapture
          value={selectedPhoto}
          currentPhotoUrl={student.photo_path ? `/api/student-photo/${encodeURIComponent(student.jhs_index_number)}` : null}
          onChange={(file) => {
            setSelectedPhoto(file);
            setPhotoError(null);
            setDirectSuccessMessage(null);
          }}
          error={photoError}
        />

        {directSuccessMessage && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{directSuccessMessage}</span>
          </div>
        )}

        {selectedPhoto && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={handleDirectUpload}
              disabled={directUploading}
              className="text-xs"
            >
              {directUploading ? (
                <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Uploading Photo...</>
              ) : (
                <><UploadCloud className="size-3.5 mr-1.5" /> Save &amp; Upload Photo Now</>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              Or save all changes together when you click &quot;Save Student Profile&quot; below.
            </span>
          </div>
        )}
      </section>


      {/* Form Submission Actions */}
      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <Link
          href={`/students/${encodeURIComponent(student.jhs_index_number)}`}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <ArrowLeft className="h-4 w-4" /> Cancel & Back
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
