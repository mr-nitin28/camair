-- Migration: 20261023000001_core_schema.sql
-- Description: Core relational schema for CampusOS (30 tables)
-- Standards: UUID primary keys, tenant isolation via institution_id, explicit constraints, query-matched indexes

DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.attendance_session_status AS ENUM (
        'scheduled',
        'open',
        'submitted',
        'locked'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.attendance_status AS ENUM (
        'Present',
        'Absent',
        'Late',
        'Excused'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.assessment_type AS ENUM (
        'internal',
        'midterm',
        'final_practical',
        'final_theory',
        'assignment'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.assessment_status AS ENUM (
        'draft',
        'submitted',
        'reviewed',
        'published',
        'correction_pending'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM (
        'initiated',
        'verified',
        'failed',
        'refunded'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.leave_status AS ENUM (
        'draft',
        'submitted',
        'under_review',
        'clarification_requested',
        'approved',
        'rejected',
        'withdrawn'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.doubt_status AS ENUM (
        'open',
        'answered',
        'resolved',
        'reopened'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 1. INSTITUTIONS & CAMPUSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(32) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, code)
);

-- ============================================================================
-- 2. USER PROFILES & ROLES
-- ============================================================================
-- Note: In standard Supabase, id references auth.users(id). For standalone testing or when auth.users is present,
-- we allow foreign key to auth.users if auth schema exists, otherwise fallback gracefully.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        CREATE TABLE IF NOT EXISTS public.user_profiles (
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
    ELSE
        CREATE TABLE IF NOT EXISTS public.user_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES public.user_profiles(id),
    UNIQUE(institution_id, user_id, role)
);

-- ============================================================================
-- 3. ACADEMIC HIERARCHY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, code)
);

CREATE TABLE IF NOT EXISTS public.programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    duration_years INTEGER NOT NULL CHECK (duration_years > 0 AND duration_years <= 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, code)
);

CREATE TABLE IF NOT EXISTS public.academic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    name VARCHAR(64) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (end_date > start_date),
    UNIQUE(institution_id, name)
);

CREATE TABLE IF NOT EXISTS public.semesters (
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

CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    name VARCHAR(32) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 60 CHECK (capacity > 0),
    UNIQUE(semester_id, name)
);

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    credits NUMERIC(3,1) NOT NULL CHECK (credits >= 0),
    is_elective BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(institution_id, code)
);

-- ============================================================================
-- 4. FACULTY & STUDENT PROFILES & TEACHING ASSIGNMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.faculty_profiles (
    id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    employee_code VARCHAR(64) NOT NULL,
    designation VARCHAR(128) NOT NULL,
    date_of_joining DATE NOT NULL,
    UNIQUE(institution_id, employee_code)
);

CREATE TABLE IF NOT EXISTS public.student_profiles (
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

CREATE TABLE IF NOT EXISTS public.teaching_assignments (
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

-- ============================================================================
-- 5. ATTENDANCE ENGINE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
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

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,
    status public.attendance_status NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.attendance_revisions (
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

-- ============================================================================
-- 6. EXAMINATIONS & ASSESSMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.grading_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    name VARCHAR(128) NOT NULL,
    effective_from DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grading_scale_tiers (
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

CREATE TABLE IF NOT EXISTS public.assessments (
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

CREATE TABLE IF NOT EXISTS public.assessment_results (
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

-- ============================================================================
-- 7. FINANCIAL ENGINE & LEDGER
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL REFERENCES public.programmes(id) ON DELETE RESTRICT,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    amount_minor_units BIGINT NOT NULL CHECK (amount_minor_units > 0),
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fee_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    fee_structure_id UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,
    assigned_amount_minor_units BIGINT NOT NULL CHECK (assigned_amount_minor_units >= 0),
    concession_amount_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (concession_amount_minor_units >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(fee_structure_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,
    fee_assignment_id UUID NOT NULL REFERENCES public.fee_assignments(id) ON DELETE RESTRICT,
    amount_minor_units BIGINT NOT NULL CHECK (amount_minor_units > 0),
    payment_method VARCHAR(32) NOT NULL,
    gateway_reference VARCHAR(128),
    status public.payment_status NOT NULL DEFAULT 'initiated',
    idempotency_key VARCHAR(128) NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, idempotency_key)
);

-- ============================================================================
-- 8. WORKFLOWS: LEAVES, DOUBTS, NOTIFICATIONS & AUDIT
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
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

CREATE TABLE IF NOT EXISTS public.doubts (
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

CREATE TABLE IF NOT EXISTS public.doubt_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    attachment_storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_events (
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

CREATE TABLE IF NOT EXISTS public.notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
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

CREATE TABLE IF NOT EXISTS public.institution_policies (
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

-- ============================================================================
-- INDEXES MATCHING QUERY AND RLS PATTERNS
-- ============================================================================
-- Tenant-scoping indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_inst ON public.user_profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_inst_user ON public.user_roles(institution_id, user_id);
CREATE INDEX IF NOT EXISTS idx_departments_inst ON public.departments(institution_id);
CREATE INDEX IF NOT EXISTS idx_programmes_dept ON public.programmes(institution_id, department_id);
CREATE INDEX IF NOT EXISTS idx_semesters_prog ON public.semesters(institution_id, programme_id, session_id);
CREATE INDEX IF NOT EXISTS idx_sections_sem ON public.sections(institution_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_subjects_sem ON public.subjects(institution_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_inst ON public.student_profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_section ON public.student_profiles(current_section_id);
CREATE INDEX IF NOT EXISTS idx_faculty_profiles_dept ON public.faculty_profiles(institution_id, department_id);
CREATE INDEX IF NOT EXISTS idx_teaching_assignments_faculty ON public.teaching_assignments(faculty_id);
CREATE INDEX IF NOT EXISTS idx_teaching_assignments_section_subject ON public.teaching_assignments(section_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_assignment_date ON public.attendance_sessions(teaching_assignment_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_assessments_assignment ON public.assessments(teaching_assignment_id, status);
CREATE INDEX IF NOT EXISTS idx_assessment_results_student ON public.assessment_results(student_id, assessment_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_student ON public.fee_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_student_status ON public.leave_requests(student_id, status);
CREATE INDEX IF NOT EXISTS idx_doubts_student_subject ON public.doubts(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_doubt_messages_doubt ON public.doubt_messages(doubt_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_inst_entity ON public.audit_events(institution_id, entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON public.notification_outbox(institution_id) WHERE processed_at IS NULL;
