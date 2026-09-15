import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireAcademicOrAdmin } from "@/lib/dal";
import { getClasses, getSubjects } from "@/lib/data";
import { ClassesClient } from "./_components/ClassesClient";

export const metadata: Metadata = {
  title: `Classes & Subjects | ${SCHOOL.shortName}`,
};

export default async function AcademicClassesPage() {
  await requireAcademicOrAdmin();

  const [classes, subjects] = await Promise.all([
    getClasses(),
    getSubjects(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Classes & Curriculum Allocation
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Organize academic forms, assign class teachers, and inspect course allocations.
        </p>
      </div>

      <ClassesClient
        classes={classes}
        subjects={subjects}
      />
    </div>
  );
}
