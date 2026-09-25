"use client";

import { useState, useTransition } from "react";
import { RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reverseStudentPaymentAction } from "@/lib/actions/finance";
import { formatCurrency, getFullName } from "@/lib/utils";

interface PaymentActionsCellProps {
  payment: {
    id: string;
    status: "completed" | "cancelled" | "reversed";
    receipt_number: string | null;
    amount: number;
    student: {
      first_name: string;
      middle_name?: string | null;
      last_name: string;
      jhs_index_number: string;
    };
  };
}

export function PaymentActionsCell({ payment }: PaymentActionsCellProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (payment.status !== "completed") {
    return null;
  }

  const studentName = getFullName(
    payment.student.first_name,
    payment.student.middle_name,
    payment.student.last_name
  );

  const handleReverse = () => {
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Please provide a substantive justification (at least 5 characters).");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const result = await reverseStudentPaymentAction({
          payment_id: payment.id,
          reason: reason.trim(),
        });

        if (result && !result.success) {
          setError(result.message || "Failed to reverse payment.");
        } else {
          setOpen(false);
          setReason("");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unexpected error during reversal.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 px-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
        title="Reverse this payment"
      >
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        Reverse
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle className="text-base font-semibold">
              Reverse Payment
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs pt-1 text-muted-foreground">
            This will reverse receipt{" "}
            <span className="font-mono font-medium text-foreground">
              {payment.receipt_number ?? payment.id.slice(0, 8)}
            </span>{" "}
            for {studentName} ({payment.student.jhs_index_number}) in the amount of{" "}
            <strong className="text-foreground">{formatCurrency(payment.amount)}</strong>.
            The student&apos;s ledger balance will be restored and an immutable audit record logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor={`reverse-reason-${payment.id}`}
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Reason for reversal <span className="text-rose-500">*</span>
            </label>
            <textarea
              id={`reverse-reason-${payment.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Wrong payment entered, student refunded, or bank bounce..."
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleReverse}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Reversing...
              </>
            ) : (
              "Confirm Reversal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
