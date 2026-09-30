-- Migration 20261006: Pending Operations Table & Resiliency RPCs
-- Safe, additive, non-destructive, idempotent migration for PostgreSQL 17 / Supabase

CREATE TABLE IF NOT EXISTS public.pending_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'completed', 'failed')),
  entity_name TEXT,
  entity_index TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_attempted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_ops_status ON public.pending_operations(status);
CREATE INDEX IF NOT EXISTS idx_pending_ops_created_at ON public.pending_operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_ops_idempotency ON public.pending_operations(idempotency_key);

-- RLS Enablement
ALTER TABLE public.pending_operations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pending_operations' AND policyname = 'Admins can view and manage pending operations'
  ) THEN
    CREATE POLICY "Admins can view and manage pending operations" ON public.pending_operations
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.role = 'admin' OR 'admin' = ANY(profiles.additional_roles))
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pending_operations' AND policyname = 'Users can insert pending operations'
  ) THEN
    CREATE POLICY "Users can insert pending operations" ON public.pending_operations
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
  END IF;
END $$;

-- RPC for pending operations summary
CREATE OR REPLACE FUNCTION public.get_pending_operations_summary()
RETURNS TABLE (
  total_pending INT,
  total_failed INT,
  total_completed INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')::INT,
    COUNT(*) FILTER (WHERE status = 'failed')::INT,
    COUNT(*) FILTER (WHERE status = 'completed')::INT
  FROM public.pending_operations;
END;
$$;
