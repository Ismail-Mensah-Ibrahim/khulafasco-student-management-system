"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BOARDING_TYPES, ENROLLMENT_STATUSES, GENDERS, GENDER_LABELS, GUARDIAN_RELATIONSHIPS } from "@/config/constants";
import { createStudentAction, uploadStudentPhotoAction, type EnrollmentState } from "@/lib/actions/students";
import { StudentPhotoCapture } from "@/components/shared/StudentPhotoCapture";
import type { AcademicYear, House, Program } from "@/types";


interface EnrollmentFormProps {
  academicYears: AcademicYear[];
  programs: Program[];
  houses: House[];
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending} className="min-w-40">
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending ? "Enrolling..." : "Enroll student"}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function TextField({
  name,
  label,
  type = "text",
  required = false,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}{required ? " *" : ""}</Label>
      <Input id={name} name={name} type={type} required={required} aria-invalid={Boolean(error)} />
      <FieldError message={error} />
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
  required = false,
  error,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}{required ? " *" : ""}</Label>
      <select
        id={name}
        name={name}
        required={required}
        aria-invalid={Boolean(error)}
        className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

export function EnrollmentForm({ academicYears, programs, houses }: EnrollmentFormProps) {
  const [state, formAction] = useActionState<EnrollmentState, FormData>(createStudentAction, undefined);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [retryToken, setRetryToken] = useState(0);
  const fieldErrors = state && !state.success ? state.fieldErrors ?? {} : {};
  const errorFor = (name: string) => fieldErrors[name]?.[0];

  useEffect(() => {
    if (!state?.success) return;

    if (!selectedPhoto) return;

    let cancelled = false;
    const uploadPhoto = async () => {
      setUploadStatus("uploading");
      const formData = new FormData();
      formData.append("studentId", state.studentId);
      formData.append("photo", selectedPhoto);

      try {
        const result = await uploadStudentPhotoAction(formData);
        if (!result.success) {
          throw new Error(result.error);
        }
        if (!cancelled) setUploadStatus("success");
      } catch (error) {
        if (!cancelled) {
          const msg = error instanceof Error ? error.message : "Unable to upload the student photo.";
          setPhotoError(msg === "Failed to fetch" ? "Network connection interrupted. Please try again." : msg);
          setUploadStatus("error");
        }
      }

    };

    void uploadPhoto();
    return () => {
      cancelled = true;
    };
  }, [retryToken, selectedPhoto, state]);


  return (
    <form action={formAction} className="space-y-8">
      {state && !state.success ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}

      {state?.success && selectedPhoto && uploadStatus === "uploading" ? (
        <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Student enrolled. Uploading the selected photo...
        </div>
      ) : null}

      {state?.success && uploadStatus === "error" ? (
        <div role="alert" className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Student enrolled, but the photo upload failed: {photoError}</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" size="sm" onClick={() => setRetryToken((value) => value + 1)}>
              Retry photo upload
            </Button>
            <Link className="self-center font-semibold underline underline-offset-4" href={`/students/${encodeURIComponent(state.indexNumber)}`}>
              View student record
            </Link>
          </div>
        </div>
      ) : null}

      {state?.success && (!selectedPhoto || uploadStatus === "success") ? (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-2">
            <p>Student {state.indexNumber} was enrolled successfully{selectedPhoto ? " with the selected photo" : ""}.</p>
            <Link className="font-semibold underline underline-offset-4" href={`/students/${encodeURIComponent(state.indexNumber)}`}>
              View student record
            </Link>
          </div>
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Identity and personal details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="jhs_index_number" label="JHS index number" required error={errorFor("jhs_index_number")} />
          <TextField name="date_of_birth" label="Date of birth" type="date" required error={errorFor("date_of_birth")} />
          <TextField name="first_name" label="First name" required error={errorFor("first_name")} />
          <TextField name="middle_name" label="Middle name" error={errorFor("middle_name")} />
          <TextField name="last_name" label="Last name" required error={errorFor("last_name")} />
          <SelectField
            name="gender"
            label="Gender"
            required
            error={errorFor("gender")}
            options={GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] }))}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Student photo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Optional. Scan with camera, capture live photo, or upload an image file (JPEG, PNG, WebP up to 5 MB).</p>
        </div>
        <StudentPhotoCapture
          value={selectedPhoto}
          onChange={(file) => {
            setSelectedPhoto(file);
            setPhotoError(null);
            setUploadStatus("idle");
          }}
          error={photoError}
        />
      </section>


      <section className="space-y-4">
        <h2 className="text-base font-semibold">Enrollment details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            name="academic_year_id"
            label="Academic year"
            required
            error={errorFor("academic_year_id")}
            options={academicYears.map((year) => ({ value: year.id, label: year.name }))}
          />
          <SelectField
            name="program_id"
            label="Program"
            required
            error={errorFor("program_id")}
            options={programs.map((program) => ({ value: program.id, label: program.name }))}
          />
          <SelectField
            name="house_id"
            label="House"
            error={errorFor("house_id")}
            options={houses.map((house) => ({ value: house.id, label: house.name }))}
          />
          <SelectField
            name="student_type"
            label="Student type"
            required
            error={errorFor("student_type")}
            options={BOARDING_TYPES.map((value) => ({ value, label: value === "boarding" ? "Boarding" : "Day" }))}
          />
          <SelectField
            name="enrollment_status"
            label="Enrollment status"
            required
            error={errorFor("enrollment_status")}
            options={ENROLLMENT_STATUSES.map((value) => ({ value, label: value.replace(/(^|_)\w/g, (match) => match.replace("_", " ").toUpperCase()) }))}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Previous school and location</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="previous_school" label="Previous school" error={errorFor("previous_school")} />
          <TextField name="region" label="Region" error={errorFor("region")} />
          <TextField name="district" label="District" error={errorFor("district")} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Parent or guardian</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="parent_name" label="Parent or guardian name" required error={errorFor("parent_name")} />
          <SelectField
            name="parent_relationship"
            label="Relationship"
            required
            error={errorFor("parent_relationship")}
            options={GUARDIAN_RELATIONSHIPS.map((value) => ({ value, label: value }))}
          />
          <TextField name="parent_phone" label="Phone" required error={errorFor("parent_phone")} />
          <TextField name="parent_alt_phone" label="Alternative phone" error={errorFor("parent_alt_phone")} />
          <TextField name="parent_email" label="Email" type="email" error={errorFor("parent_email")} />
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="parent_address">Address</Label>
            <Textarea id="parent_address" name="parent_address" rows={3} aria-invalid={Boolean(errorFor("parent_address"))} />
            <FieldError message={errorFor("parent_address")} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-6">
        <Link href="/students" className="rounded-lg border px-3 py-2 text-sm font-medium">
          Cancel
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
