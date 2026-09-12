CREATE OR REPLACE FUNCTION public.get_finance_receipt_detail(p_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.is_admin() OR public.is_finance_officer()) THEN
    RAISE EXCEPTION 'You are not authorized to view receipt details';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.payments AS payment
    WHERE payment.id = p_payment_id
  ) THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  WITH allocation_rows AS (
    SELECT
      allocation.id,
      allocation.amount,
      allocation.created_at,
      charge.id AS charge_id,
      charge.amount AS charge_amount,
      charge.description AS charge_description,
      charge.fee_type_id,
      charge.academic_year_id,
      fee_type.name AS fee_type_name,
      fee_type.description AS fee_type_description
    FROM public.payment_allocations AS allocation
    JOIN public.student_charges AS charge
      ON charge.id = allocation.student_charge_id
    JOIN public.fee_types AS fee_type
      ON fee_type.id = charge.fee_type_id
    WHERE allocation.payment_id = p_payment_id
  ),
  allocation_summary AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', row.id,
            'amount', row.amount,
            'student_charge', jsonb_build_object(
              'id', row.charge_id,
              'amount', row.charge_amount,
              'description', row.charge_description,
              'fee_type', jsonb_build_object(
                'id', row.fee_type_id,
                'name', row.fee_type_name,
                'description', row.fee_type_description
              ),
              'academic_year_id', row.academic_year_id
            )
          )
          ORDER BY row.created_at, row.id
        ),
        '[]'::jsonb
      ) AS allocations,
      COUNT(DISTINCT row.academic_year_id) AS academic_year_count,
      MAX(row.academic_year_id) AS academic_year_id
    FROM allocation_rows AS row
  )
  SELECT jsonb_build_object(
    'payment', jsonb_build_object(
      'id', payment.id,
      'receipt_number', payment.receipt_number,
      'amount', payment.amount,
      'payment_method', payment.payment_method,
      'reference', payment.reference,
      'status', payment.status,
      'notes', payment.notes,
      'paid_at', payment.paid_at,
      'created_at', payment.created_at,
      'recorded_by', payment.recorded_by
    ),
    'student', jsonb_build_object(
      'id', student.id,
      'jhs_index_number', student.jhs_index_number,
      'first_name', student.first_name,
      'middle_name', student.middle_name,
      'last_name', student.last_name
    ),
    'academic_year', CASE
      WHEN summary.academic_year_count = 1 THEN jsonb_build_object(
        'id', academic_year.id,
        'name', academic_year.name
      )
      ELSE NULL
    END,
    'allocations', summary.allocations
  )
  INTO result
  FROM public.payments AS payment
  JOIN public.students AS student
    ON student.id = payment.student_id
  CROSS JOIN allocation_summary AS summary
  LEFT JOIN public.academic_years AS academic_year
    ON academic_year.id = summary.academic_year_id
  WHERE payment.id = p_payment_id;

  RETURN result;
END;
$function$;
