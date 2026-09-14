"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, UploadCloud, X, ArrowLeft, User } from "lucide-react";
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
import { STUDENT_PHOTO_MAX_BYTES, STUDENT_PHOTO_TYPES } from "@/lib/storage/student-photos";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const fieldErrors = state && !state.success ? state.fieldErrors ?? {} : {};
  const errorFor = (name: string) => fieldErrors[name]?.[0];

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

  function clearPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedPhoto(null);
    setPreviewUrl(null);
    setPhotoError(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPhotoError(null);

    if (!file) {
      clearPhoto();
      return;
    }

    if (!(STUDENT_PHOTO_TYPES as readonly string[]).includes(file.type)) {
      setSelectedPhoto(null);
      setPhotoError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size <= 0 || file.size > STUDENT_PHOTO_MAX_BYTES) {
      setSelectedPhoto(null);
      setPhotoError("The photo must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadStatus("idle");
  }

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
            Upload or replace the student&apos;s passport-size photograph (Max 5 MB, JPEG, PNG, or WebP).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Current / Preview image */}
          <div className="w-36 h-44 rounded-lg border flex items-center justify-center overflow-hidden bg-muted/20 flex-shrink-0 relative">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="New photo preview" className="w-full h-full object-cover" />
            ) : student.photo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/student-photo/${encodeURIComponent(student.jhs_index_number)}`}
                alt="Current student photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-3 text-muted-foreground">
                <User className="w-10 h-10 mx-auto opacity-30 mb-1" />
                <span className="text-xs">No photo</span>
              </div>
            )}
          </div>

          {/* Upload / Replace controls */}
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <label
                htmlFor="student_photo_input"
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                style={{ borderColor: "var(--border)" }}
              >
                <UploadCloud className="h-4 w-4" />
                {student.photo_path ? "Replace Photograph" : "Upload Photograph"}
              </label>
              <input
                ref={photoInputRef}
                id="student_photo_input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
              {selectedPhoto ? (
                <Button type="button" variant="ghost" size="sm" onClick={clearPhoto} className="text-destructive">
                  <X className="h-4 w-4 mr-1" /> Remove selection
                </Button>
              ) : null}
            </div>

            {selectedPhoto ? (
              <div className="text-xs space-y-1">
                <p className="font-medium text-foreground">
                  New file selected: {selectedPhoto.name} ({(selectedPhoto.size / 1024).toFixed(1)} KB)
                </p>
                <p className="text-muted-foreground">
                  The photo will be saved when you click &quot;Save Student Profile&quot; below.
                </p>
              </div>
            ) : student.photo_path ? (
              <p className="text-xs text-muted-foreground">
                A photograph is currently on file. Select a new file above to replace it.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No photograph has been uploaded yet. Choose an image above to add one.
              </p>
            )}

            {photoError ? <p className="text-xs text-destructive">{photoError}</p> : null}
          </div>
        </div>
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
