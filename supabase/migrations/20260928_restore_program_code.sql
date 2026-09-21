-- Restore the program code column used by program forms and embedded reads.
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS code text;

UPDATE public.programs
SET code = LEFT(
  COALESCE(NULLIF(REGEXP_REPLACE(UPPER(name), '[^A-Z0-9]+', '_', 'g'), ''), 'PROGRAM')
  || '_' || REPLACE(LEFT(id::text, 8), '-', ''),
  40
)
WHERE code IS NULL OR BTRIM(code) = '';

ALTER TABLE public.programs
  ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_programs_code ON public.programs(code);