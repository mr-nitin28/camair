-- Migration: 20261023000003_rpc_state_machines.sql
-- Description: Transactional state machines, RPC functions, and shared calculation views
-- Standards: SELECT FOR UPDATE row locking, tenant scoping, audit trail logging, durable outbox notifications

-- ============================================================================
-- 1. ATTENDANCE SUBMISSION RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_submit_attendance_session(
    p_session_id UUID,
    p_records JSONB, -- Array of { "student_id": "uuid", "status": "Present"|"Absent"|"Late"|"Excused" }
    p_idempotency_key VARCHAR(128) DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session public.attendance_sessions%ROWTYPE;
    v_actor_id UUID := auth.uid();
    v_institution_id UUID;
    v_rec JSONB;
    v_new_revision_num INTEGER;
BEGIN
    -- 1. Lock session row for update
    SELECT * INTO v_session
    FROM public.attendance_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ATTENDANCE_SESSION_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    IF v_session.status = 'locked' THEN
        RAISE EXCEPTION 'ATTENDANCE_SESSION_LOCKED' USING ERRCODE = '42000';
    END IF;

    v_institution_id := v_session.institution_id;

    -- 2. Authorization guard: assigned faculty or admin
    IF NOT EXISTS (
        SELECT 1 FROM public.teaching_assignments ta
        WHERE ta.id = v_session.teaching_assignment_id
          AND ta.faculty_id = v_actor_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id
          AND ur.institution_id = v_institution_id
          AND ur.role IN ('Super Admin', 'Institution Admin', 'Academic Admin')
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ATTENDANCE_SUBMISSION' USING ERRCODE = '42501';
    END IF;

    -- 3. Upsert attendance records with cross-institution validation
    FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = (v_rec->>'student_id')::UUID
              AND sp.institution_id = v_institution_id
        ) THEN
            RAISE EXCEPTION 'STUDENT_NOT_IN_INSTITUTION' USING ERRCODE = '22023';
        END IF;

        INSERT INTO public.attendance_records (
            institution_id,
            session_id,
            student_id,
            status,
            updated_at
        ) VALUES (
            v_institution_id,
            p_session_id,
            (v_rec->>'student_id')::UUID,
            (v_rec->>'status')::public.attendance_status,
            NOW()
        )
        ON CONFLICT (session_id, student_id)
        DO UPDATE SET
            status = EXCLUDED.status,
            updated_at = NOW();
    END LOOP;

    -- 4. Create snapshot revision
    v_new_revision_num := v_session.revision_count + 1;
    INSERT INTO public.attendance_revisions (
        institution_id,
        session_id,
        revision_number,
        reason,
        performed_by,
        snapshot_records,
        created_at
    ) VALUES (
        v_institution_id,
        p_session_id,
        v_new_revision_num,
        COALESCE(p_idempotency_key, 'Attendance submitted/updated by faculty'),
        COALESCE(v_actor_id, (SELECT faculty_id FROM public.teaching_assignments WHERE id = v_session.teaching_assignment_id)),
        p_records,
        NOW()
    );

    -- 5. Transition session state
    UPDATE public.attendance_sessions
    SET status = 'submitted',
        submitted_at = COALESCE(submitted_at, NOW()),
        revision_count = v_new_revision_num
    WHERE id = p_session_id;

    -- 6. Append audit log
    INSERT INTO public.audit_events (
        institution_id,
        actor_id,
        actor_role,
        action,
        entity_name,
        entity_id,
        request_id,
        after_state,
        created_at
    ) VALUES (
        v_institution_id,
        v_actor_id,
        'Faculty',
        'SUBMIT_ATTENDANCE',
        'attendance_sessions',
        p_session_id::TEXT,
        p_idempotency_key,
        p_records,
        NOW()
    );

    -- 7. Enqueue notification outbox event
    INSERT INTO public.notification_outbox (
        institution_id,
        event_type,
        payload,
        created_at
    ) VALUES (
        v_institution_id,
        'ATTENDANCE_SUBMITTED',
        jsonb_build_object(
            'session_id', p_session_id,
            'revision_count', v_new_revision_num,
            'record_count', jsonb_array_length(p_records)
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'status', 'submitted',
        'revision_count', v_new_revision_num
    );
END;
$$;

-- ============================================================================
-- 2. LEAVE REQUEST TRANSITION RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_transition_leave_request(
    p_leave_id UUID,
    p_new_status public.leave_status,
    p_comment TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_leave public.leave_requests%ROWTYPE;
    v_actor_id UUID := auth.uid();
    v_institution_id UUID;
    v_is_owner BOOLEAN;
    v_is_approver BOOLEAN;
BEGIN
    -- 1. Lock leave request row
    SELECT * INTO v_leave
    FROM public.leave_requests
    WHERE id = p_leave_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LEAVE_REQUEST_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    v_institution_id := v_leave.institution_id;
    v_is_owner := (v_leave.student_id = v_actor_id);
    v_is_approver := EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id
          AND ur.institution_id = v_institution_id
          AND ur.role IN ('Super Admin', 'Institution Admin', 'Department Admin', 'Faculty')
    );

    -- 2. Guard against transitions from terminal states
    IF v_leave.status IN ('approved', 'rejected', 'withdrawn') THEN
        RAISE EXCEPTION 'LEAVE_REQUEST_ALREADY_RESOLVED' USING ERRCODE = '42000';
    END IF;

    -- 3. Validate state transitions and permissions
    IF p_new_status = 'withdrawn' THEN
        IF NOT v_is_owner THEN
            RAISE EXCEPTION 'ONLY_STUDENT_OWNER_CAN_WITHDRAW' USING ERRCODE = '42501';
        END IF;
    ELSIF p_new_status IN ('approved', 'rejected', 'under_review', 'clarification_requested') THEN
        IF NOT v_is_approver THEN
            RAISE EXCEPTION 'UNAUTHORIZED_LEAVE_STATUS_TRANSITION' USING ERRCODE = '42501';
        END IF;

        IF p_new_status IN ('approved', 'rejected') AND (p_comment IS NULL OR trim(p_comment) = '') THEN
            RAISE EXCEPTION 'DECISION_COMMENT_REQUIRED' USING ERRCODE = '22023';
        END IF;
    ELSE
        RAISE EXCEPTION 'INVALID_LEAVE_TRANSITION' USING ERRCODE = '22023';
    END IF;

    -- 4. Apply transition
    UPDATE public.leave_requests
    SET status = p_new_status,
        approver_id = CASE WHEN p_new_status IN ('approved', 'rejected', 'under_review') THEN v_actor_id ELSE approver_id END,
        decision_comment = CASE WHEN p_new_status IN ('approved', 'rejected') THEN p_comment ELSE decision_comment END,
        clarification_comment = CASE WHEN p_new_status = 'clarification_requested' THEN p_comment ELSE clarification_comment END,
        updated_at = NOW()
    WHERE id = p_leave_id;

    -- 5. Audit Event
    INSERT INTO public.audit_events (
        institution_id,
        actor_id,
        actor_role,
        action,
        entity_name,
        entity_id,
        before_state,
        after_state,
        created_at
    ) VALUES (
        v_institution_id,
        v_actor_id,
        CASE WHEN v_is_owner THEN 'Student' ELSE 'Faculty/Admin' END,
        'TRANSITION_LEAVE_REQUEST',
        'leave_requests',
        p_leave_id::TEXT,
        jsonb_build_object('previous_status', v_leave.status),
        jsonb_build_object('new_status', p_new_status, 'comment', p_comment),
        NOW()
    );

    -- 6. Notification Outbox
    INSERT INTO public.notification_outbox (
        institution_id,
        event_type,
        payload,
        created_at
    ) VALUES (
        v_institution_id,
        'LEAVE_STATUS_CHANGED',
        jsonb_build_object(
            'leave_id', p_leave_id,
            'student_id', v_leave.student_id,
            'new_status', p_new_status
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'leave_id', p_leave_id,
        'status', p_new_status
    );
END;
$$;

-- ============================================================================
-- 3. ASSESSMENT RESULTS PUBLISHING RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_publish_assessment_results(
    p_assessment_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_assessment public.assessments%ROWTYPE;
    v_actor_id UUID := auth.uid();
    v_institution_id UUID;
    v_result_count INTEGER;
BEGIN
    -- 1. Lock assessment row
    SELECT * INTO v_assessment
    FROM public.assessments
    WHERE id = p_assessment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ASSESSMENT_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    v_institution_id := v_assessment.institution_id;

    -- 2. Authorization guard: Examination Admin or Institution/Super Admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id
          AND ur.institution_id = v_institution_id
          AND ur.role IN ('Super Admin', 'Institution Admin', 'Examination Admin')
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ASSESSMENT_PUBLICATION' USING ERRCODE = '42501';
    END IF;

    -- 3. Idempotency check: if already published, return idempotent success
    IF v_assessment.status = 'published' THEN
        SELECT COUNT(*) INTO v_result_count
        FROM public.assessment_results
        WHERE assessment_id = p_assessment_id;

        RETURN jsonb_build_object(
            'success', true,
            'is_duplicate', true,
            'assessment_id', p_assessment_id,
            'status', 'published',
            'result_count', v_result_count
        );
    END IF;

    -- 4. Status guard: assessment must be submitted or reviewed before publication
    IF v_assessment.status NOT IN ('submitted', 'reviewed') THEN
        RAISE EXCEPTION 'CANNOT_PUBLISH_UNSUBMITTED_ASSESSMENT' USING ERRCODE = '22023';
    END IF;

    -- 5. Check that results exist to publish
    SELECT COUNT(*) INTO v_result_count
    FROM public.assessment_results
    WHERE assessment_id = p_assessment_id;

    IF v_result_count = 0 THEN
        RAISE EXCEPTION 'CANNOT_PUBLISH_ASSESSMENT_WITHOUT_RESULTS' USING ERRCODE = '22000';
    END IF;

    -- 6. Publish assessment
    UPDATE public.assessments
    SET status = 'published',
        published_at = NOW()
    WHERE id = p_assessment_id;

    -- 5. Audit Log
    INSERT INTO public.audit_events (
        institution_id,
        actor_id,
        actor_role,
        action,
        entity_name,
        entity_id,
        after_state,
        created_at
    ) VALUES (
        v_institution_id,
        v_actor_id,
        'Examination Admin',
        'PUBLISH_ASSESSMENT',
        'assessments',
        p_assessment_id::TEXT,
        jsonb_build_object('published_at', NOW(), 'result_count', v_result_count),
        NOW()
    );

    -- 6. Notification Outbox
    INSERT INTO public.notification_outbox (
        institution_id,
        event_type,
        payload,
        created_at
    ) VALUES (
        v_institution_id,
        'ASSESSMENT_PUBLISHED',
        jsonb_build_object(
            'assessment_id', p_assessment_id,
            'name', v_assessment.name,
            'result_count', v_result_count
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'assessment_id', p_assessment_id,
        'status', 'published',
        'result_count', v_result_count
    );
END;
$$;

-- ============================================================================
-- 4. IDEMPOTENT FEE PAYMENT RECORDING RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_record_fee_payment(
    p_assignment_id UUID,
    p_amount_minor_units BIGINT,
    p_payment_method TEXT,
    p_idempotency_key TEXT,
    p_gateway_reference TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_assignment public.fee_assignments%ROWTYPE;
    v_existing_payment public.fee_payments%ROWTYPE;
    v_actor_id UUID := auth.uid();
    v_new_payment_id UUID;
BEGIN
    -- 1. Idempotency check: if key already exists, return existing row
    SELECT * INTO v_existing_payment
    FROM public.fee_payments
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_duplicate', true,
            'payment_id', v_existing_payment.id,
            'status', v_existing_payment.status,
            'amount_minor_units', v_existing_payment.amount_minor_units
        );
    END IF;

    -- 2. Lock fee assignment row
    SELECT * INTO v_assignment
    FROM public.fee_assignments
    WHERE id = p_assignment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'FEE_ASSIGNMENT_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    -- Authorization guard: Must be the assigned student OR an authorized Finance/Institution Admin
    IF v_actor_id != v_assignment.student_id AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id
          AND (ur.institution_id = v_assignment.institution_id OR ur.role = 'Super Admin')
          AND ur.role IN ('Super Admin', 'Institution Admin', 'Finance Admin')
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED_FEE_PAYMENT' USING ERRCODE = '42501';
    END IF;

    IF p_amount_minor_units <= 0 THEN
        RAISE EXCEPTION 'PAYMENT_AMOUNT_MUST_BE_POSITIVE' USING ERRCODE = '22003';
    END IF;

    -- 3. Insert payment record
    INSERT INTO public.fee_payments (
        institution_id,
        student_id,
        fee_assignment_id,
        amount_minor_units,
        payment_method,
        gateway_reference,
        status,
        idempotency_key,
        verified_at,
        created_at
    ) VALUES (
        v_assignment.institution_id,
        v_assignment.student_id,
        p_assignment_id,
        p_amount_minor_units,
        p_payment_method,
        p_gateway_reference,
        'verified',
        p_idempotency_key,
        NOW(),
        NOW()
    ) RETURNING id INTO v_new_payment_id;

    -- 4. Audit Log
    INSERT INTO public.audit_events (
        institution_id,
        actor_id,
        actor_role,
        action,
        entity_name,
        entity_id,
        after_state,
        created_at
    ) VALUES (
        v_assignment.institution_id,
        v_actor_id,
        'Finance/Student',
        'RECORD_FEE_PAYMENT',
        'fee_payments',
        v_new_payment_id::TEXT,
        jsonb_build_object(
            'amount_minor_units', p_amount_minor_units,
            'idempotency_key', p_idempotency_key,
            'method', p_payment_method
        ),
        NOW()
    );

    -- 5. Outbox
    INSERT INTO public.notification_outbox (
        institution_id,
        event_type,
        payload,
        created_at
    ) VALUES (
        v_assignment.institution_id,
        'FEE_PAYMENT_VERIFIED',
        jsonb_build_object(
            'payment_id', v_new_payment_id,
            'student_id', v_assignment.student_id,
            'amount_minor_units', p_amount_minor_units
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', false,
        'payment_id', v_new_payment_id,
        'status', 'verified',
        'amount_minor_units', p_amount_minor_units
    );
END;
$$;

-- ============================================================================
-- 5. SHARED DOMAIN CALCULATION SQL FUNCTIONS
-- ============================================================================

-- Pure Attendance Percentage Calculation
CREATE OR REPLACE FUNCTION public.calc_attendance_percentage(
    p_student_id UUID,
    p_subject_id UUID DEFAULT NULL
) RETURNS NUMERIC(5,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_student_inst UUID;
    v_result NUMERIC(5,2);
BEGIN
    SELECT institution_id INTO v_student_inst
    FROM public.student_profiles
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RETURN 0.00;
    END IF;

    -- Security guard: Self student or authorized staff in same institution
    IF v_actor_id != p_student_id AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id
          AND (ur.institution_id = v_student_inst OR ur.role = 'Super Admin')
          AND ur.role IN ('Super Admin', 'Institution Admin', 'Academic Admin', 'Faculty')
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ATTENDANCE_ACCESS' USING ERRCODE = '42501';
    END IF;

    WITH student_records AS (
        SELECT ar.status
        FROM public.attendance_records ar
        JOIN public.attendance_sessions s ON s.id = ar.session_id
        JOIN public.teaching_assignments ta ON ta.id = s.teaching_assignment_id
        WHERE ar.student_id = p_student_id
          AND s.status IN ('submitted', 'locked')
          AND (p_subject_id IS NULL OR ta.subject_id = p_subject_id)
    )
    SELECT CASE 
        WHEN COUNT(*) = 0 THEN 0.00
        ELSE ROUND((COUNT(*) FILTER (WHERE status IN ('Present', 'Late', 'Excused'))::NUMERIC / COUNT(*)::NUMERIC) * 100.0, 2)
    END INTO v_result
    FROM student_records;

    RETURN COALESCE(v_result, 0.00);
END;
$$;

-- Pure Fee Outstanding Balance Calculation
CREATE OR REPLACE FUNCTION public.calc_fee_balance(
    p_fee_assignment_id UUID
) RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_assignment public.fee_assignments%ROWTYPE;
    v_balance BIGINT;
BEGIN
    SELECT * INTO v_assignment
    FROM public.fee_assignments
    WHERE id = p_fee_assignment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'FEE_ASSIGNMENT_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    -- Security guard: assigned student or finance/admin in same institution
    IF v_actor_id != v_assignment.student_id AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id
          AND (ur.institution_id = v_assignment.institution_id OR ur.role = 'Super Admin')
          AND ur.role IN ('Super Admin', 'Institution Admin', 'Finance Admin')
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED_FEE_ACCESS' USING ERRCODE = '42501';
    END IF;

    WITH payments AS (
        SELECT COALESCE(SUM(amount_minor_units), 0) AS total_paid
        FROM public.fee_payments
        WHERE fee_assignment_id = p_fee_assignment_id
          AND status = 'verified'
    )
    SELECT GREATEST(0, (v_assignment.assigned_amount_minor_units - v_assignment.concession_amount_minor_units - p.total_paid))
    INTO v_balance
    FROM payments p;

    RETURN COALESCE(v_balance, 0);
END;
$$;

-- Pure SGPA Calculation
CREATE OR REPLACE FUNCTION public.calc_sgpa(
    p_student_id UUID,
    p_semester_id UUID
) RETURNS NUMERIC(4,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_student_inst UUID;
    v_sgpa NUMERIC(4,2);
BEGIN
    SELECT institution_id INTO v_student_inst
    FROM public.student_profiles
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RETURN 0.00;
    END IF;

    -- Security guard: Self student or staff in same institution
    IF v_actor_id != p_student_id AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id
          AND (ur.institution_id = v_student_inst OR ur.role = 'Super Admin')
          AND ur.role IN ('Super Admin', 'Institution Admin', 'Academic Admin', 'Examination Admin', 'Faculty')
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED_GRADE_ACCESS' USING ERRCODE = '42501';
    END IF;

    WITH grades AS (
        SELECT 
            s.credits,
            ar.grade_points
        FROM public.assessment_results ar
        JOIN public.assessments a ON a.id = ar.assessment_id
        JOIN public.teaching_assignments ta ON ta.id = a.teaching_assignment_id
        JOIN public.subjects s ON s.id = ta.subject_id
        WHERE ar.student_id = p_student_id
          AND s.semester_id = p_semester_id
          AND a.status = 'published'
          AND ar.is_absent = FALSE
          AND ar.grade_points IS NOT NULL
    )
    SELECT CASE 
        WHEN SUM(credits) = 0 OR SUM(credits) IS NULL THEN 0.00
        ELSE ROUND(SUM(credits * grade_points) / SUM(credits), 2)
    END INTO v_sgpa
    FROM grades;

    RETURN COALESCE(v_sgpa, 0.00);
END;
$$;
