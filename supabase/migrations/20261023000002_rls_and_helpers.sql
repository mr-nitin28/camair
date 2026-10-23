-- Migration: 20261023000002_rls_and_helpers.sql
-- Description: Row Level Security (RLS) enforcement and helper functions in private schema
-- Standards: Deny by default, wrapped (select auth.uid()), multi-tenant institution scoping

CREATE SCHEMA IF NOT EXISTS private;

-- ============================================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS (private schema)
-- ============================================================================

-- Get current authenticated user's institution ID
CREATE OR REPLACE FUNCTION private.current_institution_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT institution_id FROM public.user_profiles WHERE id = (SELECT auth.uid());
$$;

-- Check if current authenticated user has a specific role
CREATE OR REPLACE FUNCTION private.has_role(p_role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
          AND (ur.role = p_role OR ur.role = 'Super Admin')
          AND ur.institution_id = (SELECT private.current_institution_id())
    );
$$;

-- Check if current authenticated user has any of the specified roles
CREATE OR REPLACE FUNCTION private.has_any_role(p_roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = (SELECT auth.uid())
          AND (ur.role = ANY(p_roles) OR ur.role = 'Super Admin')
          AND ur.institution_id = (SELECT private.current_institution_id())
    );
$$;

-- Check if current authenticated user is the assigned faculty for a teaching assignment
CREATE OR REPLACE FUNCTION private.is_assigned_faculty(p_teaching_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.teaching_assignments ta
        WHERE ta.id = p_teaching_assignment_id
          AND ta.faculty_id = (SELECT auth.uid())
    ) OR private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role]);
$$;

-- Check if a student_id belongs to the current authenticated user
CREATE OR REPLACE FUNCTION private.is_self_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT (SELECT auth.uid()) = p_student_id;
$$;

-- Helper to get student_id for a user_id
CREATE OR REPLACE FUNCTION private.get_student_id_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT id FROM public.student_profiles WHERE id = p_user_id;
$$;

-- Helper to get faculty_id for a user_id
CREATE OR REPLACE FUNCTION private.get_faculty_id_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT id FROM public.faculty_profiles WHERE id = p_user_id;
$$;

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES (30 TABLES)
-- ============================================================================
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scale_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_policies ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. POLICIES: INSTITUTIONS & CAMPUSES
-- ============================================================================
CREATE POLICY "Users can view their own institution"
ON public.institutions FOR SELECT TO authenticated
USING (id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Institution Admins can update their own institution"
ON public.institutions FOR UPDATE TO authenticated
USING (id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role]));

CREATE POLICY "Users can view campuses of their institution"
ON public.campuses FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Admins can manage campuses"
ON public.campuses FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role]));

-- ============================================================================
-- 4. POLICIES: USER PROFILES & ROLES
-- ============================================================================
CREATE POLICY "Users can view profiles in their institution"
ON public.user_profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()) AND institution_id = (SELECT private.current_institution_id()));

CREATE POLICY "Admins can insert user profiles in their institution"
ON public.user_profiles FOR INSERT TO authenticated
WITH CHECK (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role]));

CREATE POLICY "Users can view roles in their institution"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Admins can manage roles in their institution"
ON public.user_roles FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role]));

-- ============================================================================
-- 5. POLICIES: ACADEMIC HIERARCHY
-- ============================================================================
-- Departments
CREATE POLICY "Users can view departments in their institution"
ON public.departments FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role]));

-- Programmes
CREATE POLICY "Users can view programmes in their institution"
ON public.programmes FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Admins can manage programmes"
ON public.programmes FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role]));

-- Academic Sessions
CREATE POLICY "Users can view academic sessions in their institution"
ON public.academic_sessions FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Admins can manage academic sessions"
ON public.academic_sessions FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role]));

-- Semesters
CREATE POLICY "Users can view semesters in their institution"
ON public.semesters FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Admins can manage semesters"
ON public.semesters FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role]));

-- Sections
CREATE POLICY "Users can view sections in their institution"
ON public.sections FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Admins can manage sections"
ON public.sections FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role]));

-- Subjects
CREATE POLICY "Users can view subjects in their institution"
ON public.subjects FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Admins can manage subjects"
ON public.subjects FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role]));

-- ============================================================================
-- 6. POLICIES: FACULTY, STUDENTS & TEACHING ASSIGNMENTS
-- ============================================================================
-- Faculty Profiles
CREATE POLICY "Users can view faculty profiles in their institution"
ON public.faculty_profiles FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Admins or faculty self can update faculty profiles"
ON public.faculty_profiles FOR UPDATE TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND (
        id = (SELECT auth.uid()) OR
        private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role])
    )
);

CREATE POLICY "Admins can insert faculty profiles"
ON public.faculty_profiles FOR INSERT TO authenticated
WITH CHECK (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role]));

-- Student Profiles
CREATE POLICY "Users can view student profiles in their institution"
ON public.student_profiles FOR SELECT TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND (
        id = (SELECT auth.uid()) OR
        private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role, 'Department Admin'::public.app_role, 'Faculty'::public.app_role])
    )
);

CREATE POLICY "Admins can manage student profiles"
ON public.student_profiles FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role]));

-- Teaching Assignments
CREATE POLICY "Users can view teaching assignments in their institution"
ON public.teaching_assignments FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Admins can manage teaching assignments"
ON public.teaching_assignments FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role, 'Department Admin'::public.app_role]));

-- ============================================================================
-- 7. POLICIES: ATTENDANCE SESSIONS & RECORDS
-- ============================================================================
-- Attendance Sessions
CREATE POLICY "Users can view attendance sessions in their institution"
ON public.attendance_sessions FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Assigned faculty and admins can insert attendance sessions"
ON public.attendance_sessions FOR INSERT TO authenticated
WITH CHECK (
    institution_id = (SELECT private.current_institution_id()) AND
    private.is_assigned_faculty(teaching_assignment_id)
);

CREATE POLICY "Assigned faculty and admins can update non-locked attendance sessions"
ON public.attendance_sessions FOR UPDATE TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND
    status != 'locked' AND
    private.is_assigned_faculty(teaching_assignment_id)
);

-- Attendance Records
CREATE POLICY "Students see own attendance, staff see institution attendance"
ON public.attendance_records FOR SELECT TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND (
        student_id = (SELECT auth.uid()) OR
        private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role, 'Faculty'::public.app_role])
    )
);

CREATE POLICY "Assigned faculty and admins can mutate attendance records"
ON public.attendance_records FOR ALL TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND
    EXISTS (
        SELECT 1 FROM public.attendance_sessions s
        WHERE s.id = attendance_records.session_id
          AND s.status != 'locked'
          AND private.is_assigned_faculty(s.teaching_assignment_id)
    )
);

-- Attendance Revisions
CREATE POLICY "Faculty and admins can view attendance revisions"
ON public.attendance_revisions FOR SELECT TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND
    private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Academic Admin'::public.app_role, 'Faculty'::public.app_role])
);

CREATE POLICY "Faculty and admins can create attendance revisions"
ON public.attendance_revisions FOR INSERT TO authenticated
WITH CHECK (
    institution_id = (SELECT private.current_institution_id()) AND
    performed_by = (SELECT auth.uid())
);

-- ============================================================================
-- 8. POLICIES: EXAMINATIONS & ASSESSMENTS
-- ============================================================================
-- Grading Scales
CREATE POLICY "Users can view grading scales in their institution"
ON public.grading_scales FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Admins can manage grading scales"
ON public.grading_scales FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Examination Admin'::public.app_role]));

-- Grading Scale Tiers
CREATE POLICY "Users can view grading scale tiers"
ON public.grading_scale_tiers FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.grading_scales gs
    WHERE gs.id = grading_scale_tiers.scale_id
      AND (gs.institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role))
));

CREATE POLICY "Admins can manage grading scale tiers"
ON public.grading_scale_tiers FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.grading_scales gs
    WHERE gs.id = grading_scale_tiers.scale_id
      AND gs.institution_id = (SELECT private.current_institution_id())
      AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Examination Admin'::public.app_role])
));

-- Assessments
CREATE POLICY "Students view published assessments, faculty/admin view all"
ON public.assessments FOR SELECT TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND (
        status = 'published' OR
        private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Examination Admin'::public.app_role, 'Faculty'::public.app_role])
    )
);

CREATE POLICY "Faculty can create and edit assessments for their assignments"
ON public.assessments FOR ALL TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND (
        private.is_assigned_faculty(teaching_assignment_id) OR
        private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Examination Admin'::public.app_role])
    )
);

-- Assessment Results
CREATE POLICY "Students view published results only, staff view all"
ON public.assessment_results FOR SELECT TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND (
        (student_id = (SELECT auth.uid()) AND EXISTS (
            SELECT 1 FROM public.assessments a WHERE a.id = assessment_results.assessment_id AND a.status = 'published'
        )) OR
        private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Examination Admin'::public.app_role, 'Faculty'::public.app_role])
    )
);

CREATE POLICY "Faculty and exam admins can update assessment results"
ON public.assessment_results FOR ALL TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND (
        EXISTS (
            SELECT 1 FROM public.assessments a
            WHERE a.id = assessment_results.assessment_id
              AND private.is_assigned_faculty(a.teaching_assignment_id)
        ) OR
        private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Examination Admin'::public.app_role])
    )
);

-- ============================================================================
-- 9. POLICIES: FINANCE & FEE LEDGER
-- ============================================================================
-- Fee Structures
CREATE POLICY "Users can view fee structures in their institution"
ON public.fee_structures FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Finance admins can manage fee structures"
ON public.fee_structures FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Finance Admin'::public.app_role]));

-- Fee Assignments
CREATE POLICY "Students view own assignments, finance admins view all"
ON public.fee_assignments FOR SELECT TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND (
        student_id = (SELECT auth.uid()) OR
        private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Finance Admin'::public.app_role])
    )
);

CREATE POLICY "Finance admins can manage fee assignments"
ON public.fee_assignments FOR ALL TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) AND private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Finance Admin'::public.app_role]));

-- Fee Payments
CREATE POLICY "Students view own payments, finance admins view all"
ON public.fee_payments FOR SELECT TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND (
        student_id = (SELECT auth.uid()) OR
        private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Finance Admin'::public.app_role])
    )
);

CREATE POLICY "Students can initiate payments for own assignments"
ON public.fee_payments FOR INSERT TO authenticated
WITH CHECK (
    institution_id = (SELECT private.current_institution_id()) AND
    student_id = (SELECT auth.uid())
);

CREATE POLICY "Finance admins can update/verify payments"
ON public.fee_payments FOR UPDATE TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND
    private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Finance Admin'::public.app_role])
);

-- ============================================================================
-- 10. POLICIES: LEAVE REQUESTS, DOUBTS, NOTIFICATIONS & AUDIT
-- ============================================================================
-- Leave Requests
CREATE POLICY "Students see own leaves, faculty/admins see assigned leaves"
ON public.leave_requests FOR SELECT TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND (
        student_id = (SELECT auth.uid()) OR
        private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Department Admin'::public.app_role, 'Faculty'::public.app_role])
    )
);

CREATE POLICY "Students can submit own leave requests"
ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (
    institution_id = (SELECT private.current_institution_id()) AND
    student_id = (SELECT auth.uid())
);

CREATE POLICY "Students can withdraw draft/submitted leaves; Approvers can review"
ON public.leave_requests FOR UPDATE TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND (
        (student_id = (SELECT auth.uid()) AND status IN ('draft', 'submitted')) OR
        private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Department Admin'::public.app_role, 'Faculty'::public.app_role])
    )
);

-- Doubts
CREATE POLICY "Users can view doubts in their institution"
ON public.doubts FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Students can create doubts"
ON public.doubts FOR INSERT TO authenticated
WITH CHECK (
    institution_id = (SELECT private.current_institution_id()) AND
    student_id = (SELECT auth.uid())
);

CREATE POLICY "Students and faculty can update doubt status"
ON public.doubts FOR UPDATE TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND (
        student_id = (SELECT auth.uid()) OR
        private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role, 'Faculty'::public.app_role])
    )
);

-- Doubt Messages
CREATE POLICY "Users can view messages for doubts they can access"
ON public.doubt_messages FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.doubts d
    WHERE d.id = doubt_messages.doubt_id
      AND (d.institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role))
));

CREATE POLICY "Users can insert doubt messages"
ON public.doubt_messages FOR INSERT TO authenticated
WITH CHECK (
    sender_id = (SELECT auth.uid()) AND
    EXISTS (
        SELECT 1 FROM public.doubts d
        WHERE d.id = doubt_messages.doubt_id
          AND d.institution_id = (SELECT private.current_institution_id())
    )
);

-- Notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND
    recipient_id = (SELECT auth.uid())
);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND
    recipient_id = (SELECT auth.uid())
);

-- Notification Outbox (System / Admins only)
CREATE POLICY "Admins can view outbox"
ON public.notification_outbox FOR SELECT TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND
    private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role])
);

-- Audit Events (Append-only; Admins can read)
CREATE POLICY "Admins can read audit events"
ON public.audit_events FOR SELECT TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND
    private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role])
);

-- Institution Policies
CREATE POLICY "Users can view institution policies"
ON public.institution_policies FOR SELECT TO authenticated
USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'::public.app_role));

CREATE POLICY "Admins can manage institution policies"
ON public.institution_policies FOR ALL TO authenticated
USING (
    institution_id = (SELECT private.current_institution_id()) AND
    private.has_any_role(ARRAY['Super Admin'::public.app_role, 'Institution Admin'::public.app_role])
);
