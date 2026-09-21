import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { verifySession } from "@/lib/dal";
import { hasRole } from "@/config/constants";
import { getRequests } from "@/lib/data";
import { RequestsClient } from "./_components/RequestsClient";

export const metadata: Metadata = {
  title: `Requisitions & Operational Requests | ${SCHOOL.shortName}`,
};

interface RequestsPageProps {
  searchParams: Promise<{
    status?: string;
    id?: string;
  }>;
}

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const session = await verifySession();
  const params = await searchParams;

  // Reviewers (Headmaster & Admin) see all requests. Other roles see their requests.
  // Finance Officer sees all requests to handle release/disbursements.
  const isReviewerOrFinance =
    hasRole(session.role, session.additionalRoles, "headmaster") ||
    hasRole(session.role, session.additionalRoles, "admin") ||
    hasRole(session.role, session.additionalRoles, "finance_officer");

  const allRequests = isReviewerOrFinance
    ? await getRequests({ status: params.status })
    : await getRequests({ requesterId: session.id, status: params.status });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Requisitions & Operational Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Submit item and expenditure requests, conduct institutional reviews, and track financial disbursements.
        </p>
      </div>

      <RequestsClient
        initialRequests={allRequests}
        currentUser={session}
        focusedRequestId={params.id}
      />
    </div>
  );
}
