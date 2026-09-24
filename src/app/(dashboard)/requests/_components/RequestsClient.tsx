"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { RequestRecord } from "@/types";
import type { SessionUser } from "@/lib/dal";
import {
  reviewRequestAction,
  releaseRequestFundsAction,
  confirmRequestFulfillmentAction,
} from "@/lib/actions/requests";
import { hasRole, REQUEST_STATUSES } from "@/config/constants";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  PlusCircle,
  CheckCircle2,
  Search,
} from "lucide-react";

interface RequestsClientProps {
  initialRequests: RequestRecord[];
  currentUser: SessionUser;
  focusedRequestId?: string;
}

export function RequestsClient({
  initialRequests,
  currentUser,
  focusedRequestId,
}: RequestsClientProps) {
  const [requestsList, setRequestsList] = useState<RequestRecord[]>(initialRequests);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(
    () => initialRequests.find((r) => r.id === focusedRequestId) || null
  );

  // Review modal state
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject" | "return">("approve");
  const [approvedAmount, setApprovedAmount] = useState<string>("");
  const [reviewComments, setReviewComments] = useState("");

  // Release modal state
  const [releasedAmount, setReleasedAmount] = useState<string>("");
  const [releaseMethod, setReleaseMethod] = useState("Cash");
  const [releaseReference, setReleaseReference] = useState("");

  const [activeModal, setActiveModal] = useState<"review" | "release" | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const [isPending, startTransition] = useTransition();

  const isReviewer =
    hasRole(currentUser.role, currentUser.additionalRoles, "headmaster") ||
    hasRole(currentUser.role, currentUser.additionalRoles, "assistant_headmaster") ||
    hasRole(currentUser.role, currentUser.additionalRoles, "admin");
  const isFinance = hasRole(currentUser.role, currentUser.additionalRoles, "finance_officer") || hasRole(currentUser.role, currentUser.additionalRoles, "admin");

  const filteredRequests = requestsList.filter((req) => {
    if (filterStatus !== "all" && req.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        req.title.toLowerCase().includes(q) ||
        req.category.toLowerCase().includes(q) ||
        req.requester?.full_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openReviewModal = (req: RequestRecord) => {
    setSelectedRequest(req);
    setApprovedAmount(String(req.amount_requested || 0));
    setReviewComments("");
    setReviewDecision("approve");
    setActiveModal("review");
    setFeedback(null);
  };

  const openReleaseModal = (req: RequestRecord) => {
    setSelectedRequest(req);
    setReleasedAmount(String(req.amount_approved || req.amount_requested || 0));
    setReleaseMethod("Cash");
    setReleaseReference("");
    setActiveModal("release");
    setFeedback(null);
  };

  const handleReviewSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRequest) return;

    const formData = new FormData();
    formData.append("request_id", selectedRequest.id);
    formData.append("action", reviewDecision);
    if (reviewDecision === "approve") {
      formData.append("amount_approved", approvedAmount);
    }
    formData.append("review_comments", reviewComments);

    startTransition(async () => {
      const res = await reviewRequestAction(undefined, formData);
      if (res.success) {
        setFeedback({ text: res.message, isError: false });
        setActiveModal(null);
        // Refresh local list
        setRequestsList((prev) =>
          prev.map((r) =>
            r.id === selectedRequest.id
              ? {
                  ...r,
                  status:
                    reviewDecision === "approve"
                      ? "waiting_release"
                      : reviewDecision === "reject"
                      ? "rejected"
                      : "returned",
                  amount_approved: reviewDecision === "approve" ? Number(approvedAmount) : null,
                  review_comments: reviewComments,
                }
              : r
          )
        );
      } else {
        setFeedback({ text: res.message, isError: true });
      }
    });
  };

  const handleReleaseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRequest) return;

    const formData = new FormData();
    formData.append("request_id", selectedRequest.id);
    formData.append("amount_released", releasedAmount);
    formData.append("release_method", releaseMethod);
    formData.append("release_reference", releaseReference);

    startTransition(async () => {
      const res = await releaseRequestFundsAction(undefined, formData);
      if (res.success) {
        setFeedback({ text: res.message, isError: false });
        setActiveModal(null);
        setRequestsList((prev) =>
          prev.map((r) =>
            r.id === selectedRequest.id
              ? {
                  ...r,
                  status: "released",
                  amount_released: Number(releasedAmount),
                  release_method: releaseMethod,
                  release_reference: releaseReference,
                }
              : r
          )
        );
      } else {
        setFeedback({ text: res.message, isError: true });
      }
    });
  };

  const handleConfirmFulfillment = (requestId: string) => {
    const formData = new FormData();
    formData.append("request_id", requestId);

    startTransition(async () => {
      const res = await confirmRequestFulfillmentAction(undefined, formData);
      if (res.success) {
        setFeedback({ text: res.message, isError: false });
        setRequestsList((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: "completed" } : r))
        );
      } else {
        setFeedback({ text: res.message, isError: true });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, category, requester..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ").toUpperCase()}
              </option>
            ))}
          </select>

          <Button render={<Link href="/requests/new" />} size="sm">
            <PlusCircle className="size-4 mr-1" /> New Requisition
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            feedback.isError
              ? "bg-destructive/10 border-destructive/20 text-destructive"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Requests Table */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            Requisitions ({filteredRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No requisitions match your criteria.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredRequests.map((req) => {
                const canReview =
                  isReviewer &&
                  (req.status === "submitted" || req.status === "under_review") &&
                  req.requester_id !== currentUser.id;

                const canRelease =
                  isFinance &&
                  (req.status === "waiting_release" || req.status === "approved") &&
                  req.requester_id !== currentUser.id;

                const canFulfill =
                  req.requester_id === currentUser.id && req.status === "released";

                return (
                  <div
                    key={req.id}
                    className="py-4 flex flex-col md:flex-row md:items-start justify-between gap-4 first:pt-0 last:pb-0"
                  >
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-foreground">{req.title}</h3>
                        <Badge variant="outline" className="text-[10px]">
                          {req.category}
                        </Badge>
                        <Badge
                          variant={
                            req.status === "completed"
                              ? "default"
                              : req.status === "waiting_release" || req.status === "approved"
                              ? "secondary"
                              : req.status === "rejected"
                              ? "destructive"
                              : "outline"
                          }
                          className="capitalize text-[10px]"
                        >
                          {req.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {req.priority}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">{req.description}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                        <span>
                          Requester: <strong>{req.requester?.full_name ?? "Staff"}</strong>
                        </span>
                        <span>
                          Requested: <strong>GH₵ {formatCurrency(req.amount_requested)}</strong>
                        </span>
                        {req.amount_approved !== null && (
                          <span>
                            Approved: <strong className="text-emerald-600">GH₵ {formatCurrency(req.amount_approved)}</strong>
                          </span>
                        )}
                        {req.amount_released !== null && (
                          <span>
                            Released: <strong className="text-blue-600">GH₵ {formatCurrency(req.amount_released)}</strong>
                          </span>
                        )}
                        <span>Date: {new Date(req.created_at).toLocaleDateString()}</span>
                      </div>

                      {req.review_comments && (
                        <div className="p-2 rounded bg-muted/40 border border-border/50 text-xs text-muted-foreground mt-1.5">
                          <strong className="text-foreground">Reviewer Note:</strong> {req.review_comments}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
                      {canReview && (
                        <Button
                          onClick={() => openReviewModal(req)}
                          size="xs"
                          variant="default"
                          className="text-xs"
                        >
                          Review & Sign
                        </Button>
                      )}

                      {canRelease && (
                        <Button
                          onClick={() => openReleaseModal(req)}
                          size="xs"
                          variant="default"
                          className="text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                          Release Funds
                        </Button>
                      )}

                      {canFulfill && (
                        <Button
                          onClick={() => handleConfirmFulfillment(req.id)}
                          disabled={isPending}
                          size="xs"
                          variant="outline"
                          className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="size-3.5 mr-1" /> Confirm Received
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      {activeModal === "review" && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-heading font-bold text-base text-foreground">Executive Requisition Review</h3>
              <Button onClick={() => setActiveModal(null)} variant="ghost" size="xs">✕</Button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Title</p>
                <p className="text-sm font-semibold text-foreground">{selectedRequest.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Requested by: <strong>{selectedRequest.requester?.full_name}</strong> (GH₵ {formatCurrency(selectedRequest.amount_requested)})
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Decision</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision("approve")}
                    className={`py-1.5 px-3 rounded-md text-xs font-semibold border text-center transition-all ${
                      reviewDecision === "approve"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision("return")}
                    className={`py-1.5 px-3 rounded-md text-xs font-semibold border text-center transition-all ${
                      reviewDecision === "return"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    Return
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision("reject")}
                    className={`py-1.5 px-3 rounded-md text-xs font-semibold border text-center transition-all ${
                      reviewDecision === "reject"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {reviewDecision === "approve" && (
                <div className="space-y-1.5">
                  <Label htmlFor="apprAmt" className="text-xs font-semibold">Approved Amount (GH₵)</Label>
                  <Input
                    id="apprAmt"
                    type="number"
                    min="0"
                    step="0.01"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="revNotes" className="text-xs font-semibold">Executive Comments / Remarks</Label>
                <Textarea
                  id="revNotes"
                  rows={3}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Provide feedback or justification..."
                  className="text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} variant="ghost" size="sm">
                  Cancel
                </Button>
                <Button type="submit" loading={isPending} loadingText="Submitting..." size="sm">
                  Confirm Decision
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Release Modal */}
      {activeModal === "release" && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-heading font-bold text-base text-foreground">Disburse Approved Funds</h3>
              <Button onClick={() => setActiveModal(null)} variant="ghost" size="xs">✕</Button>
            </div>

            <form onSubmit={handleReleaseSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Title</p>
                <p className="text-sm font-semibold text-foreground">{selectedRequest.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Approved Amount: <strong>GH₵ {formatCurrency(selectedRequest.amount_approved || 0)}</strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="relAmt" className="text-xs font-semibold">Disbursed Amount (GH₵)</Label>
                <Input
                  id="relAmt"
                  type="number"
                  min="0"
                  step="0.01"
                  value={releasedAmount}
                  onChange={(e) => setReleasedAmount(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="relMethod" className="text-xs font-semibold">Disbursement Method</Label>
                <select
                  id="relMethod"
                  value={releaseMethod}
                  onChange={(e) => setReleaseMethod(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Cash">Cash (Petty Cash)</option>
                  <option value="Mobile Money">Mobile Money (MoMo)</option>
                  <option value="Bank Transfer">Bank Transfer / Cheque</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="relRef" className="text-xs font-semibold">Voucher / Cheque / MoMo Ref</Label>
                <Input
                  id="relRef"
                  type="text"
                  value={releaseReference}
                  onChange={(e) => setReleaseReference(e.target.value)}
                  placeholder="e.g. PV-2026-042 or MoMo TXN ID"
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setActiveModal(null)} variant="ghost" size="sm">
                  Cancel
                </Button>
                <Button type="submit" loading={isPending} loadingText="Releasing..." size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  Confirm Release
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
