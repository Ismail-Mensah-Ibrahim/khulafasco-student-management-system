import type { Metadata } from "next";
import { SCHOOL } from "@/config/branding";
import { verifySession } from "@/lib/dal";
import { hasRole } from "@/config/constants";
import { getITTickets } from "@/lib/data";
import { ITTicketsClient } from "./_components/ITTicketsClient";

export const metadata: Metadata = {
  title: `IT Tickets & Support | ${SCHOOL.shortName}`,
};

export default async function ITTicketsPage() {
  const session = await verifySession();
  const isIT = hasRole(session.role, session.additionalRoles, "it_officer") || hasRole(session.role, session.additionalRoles, "admin");
  const tickets = isIT ? await getITTickets() : await getITTickets({ requesterId: session.id });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          {isIT ? "IT Support Tickets & Password Services" : "IT Helpdesk & Technical Support"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isIT
            ? "Triage faculty and staff support requests, update progress, and dispatch secure password resets."
            : "Report hardware issues, network troubles, portal assistance, or audiovisual requests."}
        </p>
      </div>

      <ITTicketsClient initialTickets={tickets} sessionUserId={session.id} isIT={isIT} />
    </div>
  );
}
