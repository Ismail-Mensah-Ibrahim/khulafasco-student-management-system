-- Migration: 20260922_house_rebalance_and_roster.sql
-- Function to atomically rebalance houses, update student records, and write audit trail

CREATE OR REPLACE FUNCTION public.rebalance_houses_atomic(
  p_moves jsonb,
  p_actor_id uuid,
  p_actor_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_move jsonb;
  v_student_id uuid;
  v_to_house_id uuid;
  v_from_house_id uuid;
  v_from_house_name text;
  v_to_house_name text;
  v_student_name text;
  v_student_index text;
  v_student_gender text;
  v_count integer := 0;
  v_new_count integer := 0;
  v_reassign_count integer := 0;
BEGIN
  -- Iterate through moves
  FOR v_move IN SELECT * FROM jsonb_array_elements(p_moves)
  LOOP
    v_student_id := (v_move->>'studentId')::uuid;
    v_to_house_id := (v_move->>'toHouseId')::uuid;

    -- Fetch current student details
    SELECT
      s.house_id,
      h.name,
      s.first_name || ' ' || s.last_name,
      s.jhs_index_number,
      s.gender
    INTO
      v_from_house_id,
      v_from_house_name,
      v_student_name,
      v_student_index,
      v_student_gender
    FROM public.students s
    LEFT JOIN public.houses h ON h.id = s.house_id
    WHERE s.id = v_student_id;

    -- Fetch target house name
    SELECT name INTO v_to_house_name FROM public.houses WHERE id = v_to_house_id;

    -- Update student house
    UPDATE public.students
    SET house_id = v_to_house_id,
        updated_at = NOW()
    WHERE id = v_student_id;

    -- Count move type
    IF v_from_house_id IS NULL THEN
      v_new_count := v_new_count + 1;
    ELSE
      v_reassign_count := v_reassign_count + 1;
    END IF;

    -- Insert individual student audit log
    INSERT INTO public.audit_logs (
      user_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      module,
      target_identifier,
      description,
      before_data,
      after_data,
      metadata,
      severity,
      status
    ) VALUES (
      p_actor_id,
      p_actor_role,
      CASE WHEN v_from_house_id IS NULL THEN 'STUDENT_HOUSE_ASSIGNED' ELSE 'STUDENT_HOUSE_REASSIGNED' END,
      'students',
      v_student_id,
      'HOUSE',
      v_student_index,
      CASE WHEN v_from_house_id IS NULL
        THEN 'Assigned student ' || COALESCE(v_student_name, 'Unknown') || ' (' || COALESCE(v_student_index, 'N/A') || ') to ' || COALESCE(v_to_house_name, 'Unknown')
        ELSE 'Reassigned student ' || COALESCE(v_student_name, 'Unknown') || ' (' || COALESCE(v_student_index, 'N/A') || ') from ' || COALESCE(v_from_house_name, 'Unassigned') || ' to ' || COALESCE(v_to_house_name, 'Unknown')
      END,
      jsonb_build_object('house_id', v_from_house_id, 'house_name', v_from_house_name),
      jsonb_build_object('house_id', v_to_house_id, 'house_name', v_to_house_name),
      jsonb_build_object(
        'student_id', v_student_id,
        'jhs_index_number', v_student_index,
        'student_name', v_student_name,
        'gender', v_student_gender,
        'from_house_id', v_from_house_id,
        'from_house_name', v_from_house_name,
        'to_house_id', v_to_house_id,
        'to_house_name', v_to_house_name
      ),
      'INFO',
      'SUCCESS'
    );

    v_count := v_count + 1;
  END LOOP;

  -- Insert master summary audit log
  INSERT INTO public.audit_logs (
    user_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    module,
    target_identifier,
    description,
    metadata,
    severity,
    status
  ) VALUES (
    p_actor_id,
    p_actor_role,
    'HOUSE_REBALANCED',
    'houses',
    NULL,
    'HOUSE',
    'ALL_HOUSES',
    'Executed automated house rebalancing. Processed ' || v_count || ' moves: ' || v_new_count || ' new assignments, ' || v_reassign_count || ' reassignments.',
    jsonb_build_object(
      'total_moves', v_count,
      'new_assignments', v_new_count,
      'reassignments', v_reassign_count
    ),
    'INFO',
    'SUCCESS'
  );

  RETURN jsonb_build_object(
    'success', true,
    'moves_applied', v_count,
    'new_assignments', v_new_count,
    'reassignments', v_reassign_count
  );
END;
$$;
