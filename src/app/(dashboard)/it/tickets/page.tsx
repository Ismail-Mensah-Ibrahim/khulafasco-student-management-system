import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { requireITOfficer } from "@/lib/dal";
import { getITTickets } from "@/lib/data";
import { ITTicketsClient } from "./_components/ITTicketsClient";

export const metadata: Metadata = {
  title: `IT Tickets & Support | ${SCHOOL.shortName}`,
};

export default async function ITTicketsPage() {
  const session = await requireITOfficer();
  const tickets = await getITTickets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          IT Support Tickets & Password Services
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Triage faculty and staff support requests, update progress, and dispatch secure password resets.
        </p>
      </div>

      <ITTicketsClient initialTickets={tickets} sessionUserId={session.id} />
    </div>
  );
}
