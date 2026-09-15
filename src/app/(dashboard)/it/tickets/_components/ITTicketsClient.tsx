"use client";

import { useState, useTransition } from "react";
import type { ITTicket } from "@/types";
import { updateTicketStatusAction, initiatePasswordResetAction } from "@/lib/actions/it-tickets";
import { IT_TICKET_STATUSES, type ITTicketStatus } from "@/config/constants";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LifeBuoy,
  KeyRound,
  Search,
  Filter,
} from "lucide-react";

interface ITTicketsClientProps {
  initialTickets: ITTicket[];
  sessionUserId: string;
}

export function ITTicketsClient({ initialTickets, sessionUserId }: ITTicketsClientProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTicket, setActiveTicket] = useState<ITTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ITTicketStatus>("in_progress");

  // Feedback messages
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [resetMessage, setResetMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [isPendingStatus, startTransitionStatus] = useTransition();
  const [isPendingReset, startTransitionReset] = useTransition();

  const filteredTickets = initialTickets.filter((ticket) => {
    if (filterStatus !== "all" && ticket.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ticket.title.toLowerCase().includes(q) ||
        ticket.category.toLowerCase().includes(q) ||
        ticket.requester?.full_name.toLowerCase().includes(q) ||
        (ticket.location && ticket.location.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleUpdateStatus = (ticket: ITTicket) => {
    setActiveTicket(ticket);
    setSelectedStatus(ticket.status);
    setResolutionNotes(ticket.resolution_notes || "");
    setStatusMessage(null);
  };

  const submitStatusUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeTicket) return;

    const formData = new FormData();
    formData.append("ticket_id", activeTicket.id);
    formData.append("status", selectedStatus);
    formData.append("assigned_to", sessionUserId);
    formData.append("resolution_notes", resolutionNotes);

    startTransitionStatus(async () => {
      const res = await updateTicketStatusAction(undefined, formData);
      if (res.success) {
        setStatusMessage({ text: res.message, isError: false });
        setActiveTicket(null);
      } else {
        setStatusMessage({ text: res.message, isError: true });
      }
    });
  };

  const submitPasswordReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransitionReset(async () => {
      const res = await initiatePasswordResetAction(undefined, formData);
      setResetMessage({ text: res.message, isError: !res.success });
      if (res.success) {
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Password Reset Utility Card */}
      <Card id="reset" className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            Quick Dispatch: Staff Password Reset Email
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={submitPasswordReset} className="flex flex-col sm:flex-row items-end gap-3 max-w-xl">
            <div className="flex-1 w-full space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">Staff Member Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="teacher@khulafasco.edu.gh"
                required
                className="text-sm h-9"
              />
            </div>
            <Button type="submit" disabled={isPendingReset} size="default" className="shrink-0 h-9">
              {isPendingReset ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
          {resetMessage && (
            <p className={`text-xs mt-2 font-medium ${resetMessage.isError ? "text-destructive" : "text-emerald-600"}`}>
              {resetMessage.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by title, category, or staff..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            {IT_TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-3 rounded-lg text-sm border ${statusMessage.isError ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
          {statusMessage.text}
        </div>
      )}

      {/* Tickets List */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-semibold">
            Support Tickets ({filteredTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {filteredTickets.length === 0 ? (
            <div className="py-12 text-center">
              <LifeBuoy className="size-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No tickets match your filter criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground">{ticket.title}</h3>
                      <Badge
                        variant={
                          ticket.status === "open"
                            ? "destructive"
                            : ticket.status === "in_progress"
                            ? "default"
                            : ticket.status === "resolved"
                            ? "outline"
                            : "secondary"
                        }
                        className="text-[11px] capitalize"
                      >
                        {ticket.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        Priority: {ticket.priority}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">{ticket.description}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1">
                      <span>Requester: <strong>{ticket.requester?.full_name ?? "Unknown"}</strong> ({ticket.requester?.role})</span>
                      <span>Category: {ticket.category}</span>
                      {ticket.location && <span>Location: {ticket.location}</span>}
                      <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                      {ticket.assignee && (
                        <span>Assigned to: <strong>{ticket.assignee.full_name}</strong></span>
                      )}
                    </div>

                    {ticket.resolution_notes && (
                      <div className="p-2 rounded-md bg-muted/40 border border-border/50 text-xs text-muted-foreground mt-2">
                        <strong className="text-foreground">Resolution Notes:</strong> {ticket.resolution_notes}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      onClick={() => handleUpdateStatus(ticket)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Update / Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal / Update Panel for Selected Ticket */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-heading font-bold text-base text-foreground">Update Ticket Status</h3>
              <Button onClick={() => setActiveTicket(null)} variant="ghost" size="xs">✕</Button>
            </div>

            <form onSubmit={submitStatusUpdate} className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Ticket Title</p>
                <p className="text-sm font-semibold text-foreground">{activeTicket.title}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="statusSelect" className="text-xs font-semibold">New Status</Label>
                <select
                  id="statusSelect"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as ITTicketStatus)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {IT_TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-semibold">Resolution / Update Notes</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Details on what action was taken to resolve this problem..."
                  className="text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setActiveTicket(null)} variant="ghost" size="sm">
                  Cancel
                </Button>
                <Button type="submit" disabled={isPendingStatus} size="sm">
                  {isPendingStatus ? "Saving..." : "Save Status"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
