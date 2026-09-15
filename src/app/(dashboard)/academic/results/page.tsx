import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireAcademicOrAdmin } from "@/lib/dal";
import { getStudentResults, getClasses, getSubjects } from "@/lib/data";
import { ResultsReviewClient } from "./_components/ResultsReviewClient";

export const metadata: Metadata = {
  title: `Assessment Results Review | ${SCHOOL.shortName}`,
};

export default async function AcademicResultsPage() {
  await requireAcademicOrAdmin();

  const [results, classes, subjects] = await Promise.all([
    getStudentResults(),
    getClasses(),
    getSubjects(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Assessment & Terminal Results Review
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Verify scores, inspect grade allocations, and approve student assessment batches for publication.
        </p>
      </div>

      <ResultsReviewClient
        initialResults={results}
        classes={classes}
        subjects={subjects}
      />
    </div>
  );
}
