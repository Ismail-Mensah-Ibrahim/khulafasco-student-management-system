"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

interface SubmitButtonProps extends ComponentProps<typeof Button> {
  loadingText?: string;
}

/**
 * Enhanced form submit button that automatically detects pending form state
 * via useFormStatus(), disables itself to prevent double-clicks, and shows
 * an animated loader with feedback text.
 */
export function SubmitButton({
  children,
  loadingText = "Processing...",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      loading={pending}
      loadingText={loadingText}
      {...props}
    >
      {children}
    </Button>
  );
}
