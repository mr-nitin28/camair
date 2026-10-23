# CampusOS — Database Architecture & Data Flow Specification

**Database Engine:** PostgreSQL 15+ (Supabase)  
**Schema Status:** Fresh Project (`https://qjstfuxnmtomkrdyrgte.supabase.co`) — 0 existing tables in `public`  
**Architectural Standard:** Tenant-Isolated via RLS, Idempotent Mutations, Append-Only Ledgers, Transactional RPC State Machines  
**Date:** October 2026

---

## 1. Relational Entity-Relationship Model

The target schema consists of 32 cohesive tables organized into clear functional domains. All institution-owned rows carry an immutable `institution_id` with foreign key enforcement and composite indexing.

```
                           +------------------+
                           |   institutions   |
                           +--------+---------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
+---------v---------+     +---------v---------+     +---------v---------+
|     campuses      |     |  institution_     |     |   user_profiles   |
|                   |     |    policies       |     |                   |
+-------------------+     +-------------------+     +----+----+----+----+
                                                         |    |    |
        +------------------------------------------------+    |    |
        |                                                     |    |
+-------v-------+                                             |    |
| student_      |                                             |    |
|   profiles    |                                             |    |
+-------+-------+                                             |    |
        |                                                     |    |
        +-------------------------+                           |    |
        |                         |                           |    |
+-------v-------+         +-------v-------+         +---------v----+----+
|  attendance_  |         |  assessment_  |         | faculty_profiles  |
|    records    |         |    results    |         +---------+---------+
+-------^-------+         +-------^-------+                   |
        |                         |                           |
+-------+-------+         +-------+-------+                   |
|  attendance_  |         |  assessments  |                   |
|   sessions    |         +-------^-------+                   |
+-------+-------+                 |                           |
        |                         |                           |
        +-------------------------+---------------------------+
                                  |
                        +---------v---------+
                        | teaching_         |
                        |   assignments     |
                        +---------+---------+
                                  |
                        +---------v---------+
                        |     subjects      |
                        +---------+---------+
                                  |
                        +---------v---------+
                        |    semesters      |
                        +---------+---------+
                                  |
                        +---------v---------+
                        |   programmes/     |
                        |   departments     |
                        +-------------------+
```

---

## 2. Relational Schema Definition

### 2.1 Core Institution & Identity

```sql
-- 1. INSTITUTIONS
CREATE TABLE public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CAMPUSES
CREATE TABLE public.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(32) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, code)
);

-- 3. USER PROFILES
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    phone VARCHAR(32),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ROLES & PERMISSIONS
CREATE TYPE public.app_role AS ENUM (
    'Super Admin',
    'Institution Admin',
    'Academic Admin',
    'Examination Admin',
    'Finance Admin',
    'Department Admin',
    'Faculty',
    'Student'
);

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES public.user_profiles(id),
    UNIQUE(institution_id, user_id, role)
);
```

### 2.2 Academic Hierarchy

```sql
-- 5. DEPARTMENTS
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, code)
);

-- 6. PROGRAMMES (Courses)
CREATE TABLE public.programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    duration_years INTEGER NOT NULL CHECK (duration_years > 0 AND duration_years <= 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, code)
);

-- 7. ACADEMIC SESSIONS & SEMESTERS
CREATE TABLE public.academic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    name VARCHAR(64) NOT NULL, -- e.g. "2025-2026"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (end_date > start_date),
    UNIQUE(institution_id, name)
);

CREATE TABLE public.semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
    session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
    number INTEGER NOT NULL CHECK (number >= 1 AND number <= 12),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    CHECK (end_date > start_date),
    UNIQUE(programme_id, session_id, number)
);

-- 8. SECTIONS
CREATE TABLE public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    name VARCHAR(32) NOT NULL, -- e.g. "Section A"
    capacity INTEGER NOT NULL DEFAULT 60 CHECK (capacity > 0),
    UNIQUE(semester_id, name)
);

-- 9. SUBJECTS
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    credits NUMERIC(3,1) NOT NULL CHECK (credits >= 0),
    is_elective BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(institution_id, code)
);
```

### 2.3 Students, Faculty, and Teaching Assignments

```sql
-- 10. FACULTY PROFILES
CREATE TABLE public.faculty_profiles (
    id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    employee_code VARCHAR(64) NOT NULL,
    designation VARCHAR(128) NOT NULL,
    date_of_joining DATE NOT NULL,
    UNIQUE(institution_id, employee_code)
);

-- 11. STUDENT PROFILES
CREATE TABLE public.student_profiles (
    id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
    current_semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    current_section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE RESTRICT,
    enrolment_no VARCHAR(64) NOT NULL,
    roll_no VARCHAR(32) NOT NULL,
    admission_date DATE NOT NULL,
    cgpa NUMERIC(4,2) NOT NULL DEFAULT 0.00 CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
    sgpa NUMERIC(4,2) NOT NULL DEFAULT 0.00 CHECK (sgpa >= 0.00 AND sgpa <= 10.00),
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'graduated', 'withdrawn')),
    UNIQUE(institution_id, enrolment_no),
    UNIQUE(current_section_id, roll_no)
);

-- 12. TEACHING ASSIGNMENTS (Faculty to Subject & Section)
CREATE TABLE public.teaching_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.faculty_profiles(id) ON DELETE RESTRICT,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE RESTRICT,
    academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(subject_id, section_id, faculty_id)
);
```

### 2.4 Attendance Engine (Sessions & Revisions)

```sql
-- 13. ATTENDANCE SESSIONS
CREATE TYPE public.attendance_session_status AS ENUM ('scheduled', 'open', 'submitted', 'locked');

CREATE TABLE public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    teaching_assignment_id UUID NOT NULL REFERENCES public.teaching_assignments(id) ON DELETE RESTRICT,
    session_date DATE NOT NULL,
    slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 12),
    status public.attendance_session_status NOT NULL DEFAULT 'scheduled',
    opened_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    revision_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(teaching_assignment_id, session_date, slot_number)
);

-- 14. ATTENDANCE RECORDS (Authoritative Facts)
CREATE TYPE public.attendance_status AS ENUM ('Present', 'Absent', 'Late', 'Excused');

CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,
    status public.attendance_status NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

-- 15. ATTENDANCE REVISIONS (Immutable Audit Ledger)
CREATE TABLE public.attendance_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    reason TEXT NOT NULL,
    performed_by UUID NOT NULL REFERENCES public.user_profiles(id),
    snapshot_records JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, revision_number)
);
```

### 2.5 Examination & Assessment Architecture

```sql
-- 16. GRADING SCALES (Versioned Policies)
CREATE TABLE public.grading_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    name VARCHAR(128) NOT NULL,
    effective_from DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.grading_scale_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scale_id UUID NOT NULL REFERENCES public.grading_scales(id) ON DELETE CASCADE,
    grade VARCHAR(8) NOT NULL,
    grade_points NUMERIC(4,2) NOT NULL,
    min_percentage NUMERIC(5,2) NOT NULL CHECK (min_percentage >= 0 AND min_percentage <= 100),
    max_percentage NUMERIC(5,2) NOT NULL CHECK (max_percentage >= 0 AND max_percentage <= 100),
    description VARCHAR(64),
    CHECK (max_percentage >= min_percentage),
    UNIQUE(scale_id, grade)
);

-- 17. ASSESSMENTS
CREATE TYPE public.assessment_type AS ENUM ('internal', 'midterm', 'final_practical', 'final_theory', 'assignment');
CREATE TYPE public.assessment_status AS ENUM ('draft', 'submitted', 'reviewed', 'published', 'correction_pending');

CREATE TABLE public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    teaching_assignment_id UUID NOT NULL REFERENCES public.teaching_assignments(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    type public.assessment_type NOT NULL,
    max_marks NUMERIC(5,2) NOT NULL CHECK (max_marks > 0),
    weightage_percent NUMERIC(5,2) NOT NULL CHECK (weightage_percent > 0 AND weightage_percent <= 100),
    status public.assessment_status NOT NULL DEFAULT 'draft',
    grading_scale_id UUID NOT NULL REFERENCES public.grading_scales(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- 18. ASSESSMENT RESULTS
CREATE TABLE public.assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,
    marks_obtained NUMERIC(5,2) NOT NULL CHECK (marks_obtained >= 0),
    grade VARCHAR(8),
    grade_points NUMERIC(4,2),
    is_absent BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(assessment_id, student_id)
);
```

### 2.6 Financial Engine (Double-Entry Ledger)

```sql
-- 19. FEE STRUCTURES
CREATE TABLE public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    amount_minor_units BIGINT NOT NULL CHECK (amount_minor_units > 0), -- Stored in paise / minor units
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. FEE ASSIGNMENTS
CREATE TABLE public.fee_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    fee_structure_id UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,
    assigned_amount_minor_units BIGINT NOT NULL CHECK (assigned_amount_minor_units >= 0),
    concession_amount_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (concession_amount_minor_units >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(fee_structure_id, student_id)
);

-- 21. FEE PAYMENTS & LEDGER
CREATE TYPE public.payment_status AS ENUM ('initiated', 'verified', 'failed', 'refunded');

CREATE TABLE public.fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,
    fee_assignment_id UUID NOT NULL REFERENCES public.fee_assignments(id) ON DELETE RESTRICT,
    amount_minor_units BIGINT NOT NULL CHECK (amount_minor_units > 0),
    payment_method VARCHAR(32) NOT NULL, -- UPI, NetBanking, Card, Cash
    gateway_reference VARCHAR(128),
    status public.payment_status NOT NULL DEFAULT 'initiated',
    idempotency_key VARCHAR(128) NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, idempotency_key)
);
```

### 2.7 Workflows: Leaves, Doubts & Services

```sql
-- 22. LEAVE REQUESTS
CREATE TYPE public.leave_status AS ENUM (
    'draft',
    'submitted',
    'under_review',
    'clarification_requested',
    'approved',
    'rejected',
    'withdrawn'
);

CREATE TABLE public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status public.leave_status NOT NULL DEFAULT 'submitted',
    attachment_storage_path TEXT,
    approver_id UUID REFERENCES public.user_profiles(id),
    clarification_comment TEXT,
    decision_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- 23. DOUBTS & MESSAGING
CREATE TYPE public.doubt_status AS ENUM ('open', 'answered', 'resolved', 'reopened');

CREATE TABLE public.doubts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    status public.doubt_status NOT NULL DEFAULT 'open',
    reopen_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.doubt_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    attachment_storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.8 Audit Trail, Outbox, and Policies

```sql
-- 24. AUDIT EVENTS (Append-Only)
CREATE TABLE public.audit_events (
    id BIGSERIAL PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    actor_role VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    entity_name VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    request_id VARCHAR(128),
    client_ip VARCHAR(64),
    before_state JSONB,
    after_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 25. NOTIFICATION OUTBOX
CREATE TABLE public.notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 26. NOTIFICATIONS (Per-Recipient Inboxes)
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(64) NOT NULL,
    deep_link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 27. INSTITUTION POLICIES (Versioned Rules)
CREATE TABLE public.institution_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    attendance_threshold_percent NUMERIC(5,2) NOT NULL DEFAULT 75.00,
    fee_clearance_required_for_exam BOOLEAN NOT NULL DEFAULT TRUE,
    attendance_correction_window_hours INTEGER NOT NULL DEFAULT 48,
    doubt_reopen_limit INTEGER NOT NULL DEFAULT 2,
    effective_from DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, effective_from)
);
```

---

## 3. Transactional State Machines (PostgreSQL RPCs)

All workflow mutations run inside atomic PostgreSQL functions. Each transition:
1. Locks the subject row (`SELECT ... FOR UPDATE`).
2. Asserts tenant isolation (`institution_id = current_institution_id()`).
3. Validates current state and actor authority.
4. Performs mutation.
5. Emits an append-only audit event.
6. Enqueues an event into `notification_outbox`.

### 3.1 Attendance Submission RPC
```sql
CREATE OR REPLACE FUNCTION public.rpc_submit_attendance_session(
    p_session_id UUID,
    p_records JSONB, -- Array of { student_id: UUID, status: attendance_status }
    p_idempotency_key VARCHAR(128)
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session public.attendance_sessions%ROWTYPE;
    v_actor_id UUID := auth.uid();
    v_institution_id UUID;
    v_rec JSONB;
BEGIN
    -- 1. Lock and validate session
    SELECT * INTO v_session
    FROM public.attendance_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ATTENDANCE_SESSION_NOT_FOUND';
    END IF;

    IF v_session.status = 'locked' THEN
        RAISE EXCEPTION 'ATTENDANCE_SESSION_LOCKED';
    END IF;

    v_institution_id := v_session.institution_id;

    -- 2. Validate actor assignment
    IF NOT EXISTS (
        SELECT 1 FROM public.teaching_assignments ta
        WHERE ta.id = v_session.teaching_assignment_id
        AND ta.faculty_id = v_actor_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id
        AND ur.role IN ('Super Admin', 'Academic Admin')
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED_ATTENDANCE_SUBMISSION';
    END IF;

    -- 3. Upsert records
    FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO public.attendance_records (
            institution_id, session_id, student_id, status, updated_at
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

    -- 4. Transition session state
    UPDATE public.attendance_sessions
    SET status = 'submitted',
        submitted_at = COALESCE(submitted_at, NOW()),
        revision_count = revision_count + 1
    WHERE id = p_session_id;

    -- 5. Audit Log
    INSERT INTO public.audit_events (
        institution_id, actor_id, actor_role, action, entity_name, entity_id, after_state
    ) VALUES (
        v_institution_id, v_actor_id, 'Faculty', 'SUBMIT_ATTENDANCE', 'attendance_sessions', p_session_id::TEXT, p_records
    );

    -- 6. Outbox Event
    INSERT INTO public.notification_outbox (institution_id, event_type, payload)
    VALUES (v_institution_id, 'ATTENDANCE_SUBMITTED', jsonb_build_object('session_id', p_session_id));

    RETURN jsonb_build_object('success', true, 'session_id', p_session_id);
END;
$$;
```

---

## 4. Single Source of Truth & Consistency Models

| Domain Fact | Authoritative Source | Consistency Guarantee | Computation / Refresh Method |
| :--- | :--- | :--- | :--- |
| **Student Attendance %** | `attendance_records` | Realtime (< 1 sec) | Computed on-the-fly via view: `attended_classes / total_classes * 100` |
| **Published Results / Grades** | `assessment_results` JOIN `grading_scale_tiers` | Strict Read Consistency | Filtered by `assessments.status = 'published'` |
| **Fee Balance** | `fee_assignments` and `fee_payments` | Strict Read Consistency | Single function: `balance = assigned - concessions - verified_payments` |
| **Admin Dashboard KPIs** | Base Tables (`student_profiles`, etc.) | Scheduled / Cached | Materialized View refreshed hourly or trigger-maintained stats table |
| **Leave Routing & Status** | `leave_requests` | Read-After-Write | State transitions via `rpc_transition_leave_request` |
