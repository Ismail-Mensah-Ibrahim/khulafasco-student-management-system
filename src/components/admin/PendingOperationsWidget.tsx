"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, RotateCw } from "lucide-react";
import { PendingOperation, retryPendingOperationAction } from "@/lib/actions/pending-operations";

interface Props {
  initialOperations: PendingOperation[];
  summary?: { total_pending: number; total_failed: number; total_completed: number };
}

export function PendingOperationsWidget({ initialOperations, summary }: Props) {
  const [operations, setOperations] = useState<PendingOperation[]>(initialOperations);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; success: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeOperations = operations.filter((op) => op.status !== "completed");

  const handleRetry = (opId: string) => {
    setRetryingId(opId);
    setFeedback(null);

    startTransition(async () => {
      const res = await retryPendingOperationAction(opId);
      setRetryingId(null);
      if (res.success) {
        setFeedback({ id: opId, success: true, text: res.message });
        setOperations((prev) => prev.filter((o) => o.id !== opId));
      } else {
        setFeedback({ id: opId, success: false, text: res.message });
        setOperations((prev) =>
          prev.map((o) =>
            o.id === opId
              ? { ...o, status: "failed", retry_count: o.retry_count + 1, error_message: res.message }
              : o
          )
        );
      }
    });
  };

  return (
    <div
      className="rounded-xl p-5 border shadow-xs"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--warning-light)", color: "var(--warning)" }}
          >
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
              Pending Operations &amp; Resiliency Queue
            </h3>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Operations saved during network or transient service disruptions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {summary && summary.total_failed > 0 && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{
                background: "var(--destructive-light)",
                color: "var(--destructive)",
              }}
            >
              {summary.total_failed} Failed
            </span>
          )}
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              background: activeOperations.length > 0 ? "var(--warning-light)" : "var(--success-light)",
              color: activeOperations.length > 0 ? "var(--warning)" : "var(--success)",
            }}
          >
            {activeOperations.length} Pending
          </span>
        </div>
      </div>

      {activeOperations.length === 0 ? (
        <div className="p-4 rounded-lg border text-center my-2" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
          <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
            All operations are fully synced and healthy.
          </p>
          <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            No pending enrollments or transactions requiring manual retry.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {activeOperations.map((op) => {
            const isThisRetrying = retryingId === op.id || isPending;
            return (
              <div
                key={op.id}
                className="p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--background)",
                }}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white"
                      style={{ background: op.operation_type === "enrollment" ? "var(--brand-primary)" : "var(--info)" }}>
                      {op.operation_type}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                      {op.entity_name || "Unknown Entity"}
                    </span>
                    {op.entity_index && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                        {op.entity_index}
                      </span>
                    )}
                  </div>

                  <p className="text-xs line-clamp-1" style={{ color: "var(--muted-foreground)" }}>
                    <span className="font-semibold text-rose-500">Error:</span> {op.error_message || "Transient connection failure"}
                  </p>

                  <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                    <span>Created: {new Date(op.created_at).toLocaleString()}</span>
                    <span>Retries: <strong>{op.retry_count}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRetry(op.id)}
                    disabled={isThisRetrying}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    style={{
                      background: "var(--brand-primary)",
                      color: "var(--brand-primary-foreground)",
                    }}
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isThisRetrying ? "animate-spin" : ""}`} />
                    {isThisRetrying ? "Retrying..." : "Retry Operation"}
                  </button>

                  {feedback && feedback.id === op.id && (
                    <p className={`text-[11px] font-medium ${feedback.success ? "text-emerald-500" : "text-rose-500"}`}>
                      {feedback.text}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
