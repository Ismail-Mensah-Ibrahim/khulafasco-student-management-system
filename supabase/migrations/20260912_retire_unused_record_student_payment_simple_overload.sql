-- Retire the unused simple record_student_payment overload.
-- This move is intentionally limited to the legacy signature that has:
--   - zero active callers
--   - zero confident reverse dependencies
--   - no public application usage
--   - no dependent database object usage
-- The allocation-bearing overload remains the supported application path.

DROP FUNCTION IF EXISTS public.record_student_payment(
  text,
  numeric,
  public.payment_method_type,
  text,
  text
);
