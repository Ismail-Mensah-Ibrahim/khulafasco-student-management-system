"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteStudentAction } from "@/lib/actions/students";
import { normalizeIndexNumber } from "@/lib/utils";

interface DeleteStudentDialogProps {
  jhsIndexNumber: string;
  studentFullName: string;
}

export function DeleteStudentDialog({
  jhsIndexNumber,
  studentFullName,
}: DeleteStudentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canonicalIndex = normalizeIndexNumber(jhsIndexNumber);
  const normalizedTyped = normalizeIndexNumber(typedConfirmation);
  const isMatch = Boolean(normalizedTyped && normalizedTyped === canonicalIndex);

  function handleOpenChange(newOpen: boolean) {
    if (isDeleting) return; // Prevent closing while action is in progress
    setOpen(newOpen);
    if (!newOpen) {
      setTypedConfirmation("");
      setErrorMessage(null);
    }
  }

  async function handleDelete() {
    if (!isMatch || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const result = await deleteStudentAction(jhsIndexNumber);

      if (!result.success) {
        setErrorMessage(result.message);
        setIsDeleting(false);
        return;
      }

      setOpen(false);
      router.push("/students");
      router.refresh();
    } catch (err) {
      console.error("Delete student error:", err);
      setErrorMessage("An unexpected error occurred while deleting the student record.");
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete Student
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive flex-shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-destructive font-bold text-lg">
                Delete Student Permanently?
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5 text-muted-foreground">
                Irreversible administrative operation
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-destructive">
              This action cannot be undone.
            </p>
            <p>
              Deleting this student will permanently remove the student&apos;s profile and associated records from the system.
            </p>
            <p>
              This includes information connected to this student, such as enrollment/profile data and other dependent records where permitted by the database relationship.
            </p>
            <p className="font-medium text-foreground">
              Please make sure you are deleting the correct student record.
            </p>
          </div>

          <div className="rounded-lg border p-3 bg-muted/40 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Student Name:</span>
              <span className="font-semibold text-foreground">{studentFullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">JHS / BECE Index:</span>
              <span className="font-mono font-semibold text-foreground">{jhsIndexNumber}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation_index" className="text-xs font-medium">
              Type the student&apos;s index number (<strong>{jhsIndexNumber}</strong>) to confirm permanent deletion:
            </Label>
            <Input
              id="confirmation_index"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder={jhsIndexNumber}
              disabled={isDeleting}
              className="font-mono"
              autoComplete="off"
            />
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            className="min-w-36"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Deleting...
              </>
            ) : (
              "Delete Permanently"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
