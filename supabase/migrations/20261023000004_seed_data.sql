-- Migration: 20261023000004_seed_data.sql
-- Description: Deterministic seed data across two institutions for testing RBAC and cross-tenant isolation

-- ============================================================================
-- 1. INSTITUTIONS
-- ============================================================================
INSERT INTO public.institutions (id, code, name, legal_name, timezone, currency)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'MIT-01', 'Metropolitan Institute of Technology', 'Metropolitan Institute of Technology Society', 'Asia/Kolkata', 'INR'),
    ('00000000-0000-0000-0000-000000000002', 'PSU-02', 'Pacific State University', 'Pacific State University Trust', 'Asia/Kolkata', 'INR')
ON CONFLICT (id) DO NOTHING;

-- Campuses
INSERT INTO public.campuses (id, institution_id, name, code, address)
VALUES 
    ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Main Academic Campus', 'MAIN', 'Tech Zone 4, Knowledge Park'),
    ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', 'Downtown Campus', 'DT', '9 Ocean Boulevard')
ON CONFLICT (id) DO NOTHING;

-- Policies
INSERT INTO public.institution_policies (id, institution_id, attendance_threshold_percent, fee_clearance_required_for_exam, attendance_correction_window_hours, doubt_reopen_limit, effective_from)
VALUES 
    ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 75.00, true, 48, 2, '2026-01-01'),
    ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000002', 80.00, true, 24, 1, '2026-01-01')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. USER PROFILES
-- ============================================================================
INSERT INTO public.user_profiles (id, institution_id, email, first_name, last_name, phone, is_active)
VALUES 
    -- Super Admin
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'admin@campusos.dev', 'Platform', 'Administrator', '+919999900000', true),
    -- Institution Admin (MIT)
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'instadmin@mit.edu', 'Rajesh', 'Sharma', '+919999900001', true),
    -- Examination Admin (MIT)
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'examadmin@mit.edu', 'Sunil', 'Verma', '+919999900012', true),
    -- Finance Admin (MIT)
    ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'financeadmin@mit.edu', 'Kavita', 'Iyer', '+919999900013', true),
    -- Academic Admin (MIT)
    ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'academicadmin@mit.edu', 'Arun', 'Nair', '+919999900014', true),
    -- Department Admin (MIT)
    ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'deptadmin@mit.edu', 'Pooja', 'Reddy', '+919999900015', true),
    -- Faculty 1 (Assigned to CS601)
    ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'faculty@campusos.dev', 'Vikram', 'Mehta', '+919999900020', true),
    -- Faculty 2 (Unassigned to CS601)
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'faculty2@mit.edu', 'Ananya', 'Deshmukh', '+919999900021', true),
    -- Student 1 (MIT)
    ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'student@campusos.dev', 'Aarav', 'Patel', '+919999900030', true),
    -- Student 2 (MIT)
    ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'student2@mit.edu', 'Diya', 'Kaur', '+919999900031', true),
    -- Student 3 (PSU - Tenant B)
    ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000002', 'student@psu.edu', 'Rohan', 'Verma', '+919999900040', true)
ON CONFLICT (id) DO NOTHING;

-- Roles
INSERT INTO public.user_roles (institution_id, user_id, role)
VALUES 
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Super Admin'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'Institution Admin'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'Examination Admin'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', 'Finance Admin'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000014', 'Academic Admin'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000015', 'Department Admin'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', 'Faculty'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021', 'Faculty'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', 'Student'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000031', 'Student'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000040', 'Student')
ON CONFLICT (institution_id, user_id, role) DO NOTHING;

-- ============================================================================
-- 3. ACADEMIC STRUCTURE (MIT)
-- ============================================================================
-- Department
INSERT INTO public.departments (id, institution_id, code, name)
VALUES 
    ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'CSE', 'Computer Science & Engineering'),
    ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000002', 'CS', 'Department of Computer Science')
ON CONFLICT (id) DO NOTHING;

-- Programme
INSERT INTO public.programmes (id, institution_id, department_id, code, name, duration_years)
VALUES 
    ('00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000301', 'BTECH-CSE', 'Bachelor of Technology in Computer Science', 4),
    ('00000000-0000-0000-0000-000000000312', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000302', 'BS-CS', 'Bachelor of Science in Computer Science', 4)
ON CONFLICT (id) DO NOTHING;

-- Academic Session
INSERT INTO public.academic_sessions (id, institution_id, name, start_date, end_date, is_current)
VALUES 
    ('00000000-0000-0000-0000-000000000321', '00000000-0000-0000-0000-000000000001', '2025-2026', '2025-08-01', '2026-06-30', true),
    ('00000000-0000-0000-0000-000000000322', '00000000-0000-0000-0000-000000000002', '2025-2026', '2025-08-01', '2026-06-30', true)
ON CONFLICT (id) DO NOTHING;

-- Semester
INSERT INTO public.semesters (id, institution_id, programme_id, session_id, number, start_date, end_date)
VALUES 
    ('00000000-0000-0000-0000-000000000331', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000321', 6, '2026-01-05', '2026-05-30'),
    ('00000000-0000-0000-0000-000000000332', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000312', '00000000-0000-0000-0000-000000000322', 6, '2026-01-05', '2026-05-30')
ON CONFLICT (id) DO NOTHING;

-- Section
INSERT INTO public.sections (id, institution_id, semester_id, name, capacity)
VALUES 
    ('00000000-0000-0000-0000-000000000341', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000331', 'Section A', 60),
    ('00000000-0000-0000-0000-000000000342', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000332', 'Section 1', 60)
ON CONFLICT (id) DO NOTHING;

-- Subjects
INSERT INTO public.subjects (id, institution_id, semester_id, code, name, credits)
VALUES 
    ('00000000-0000-0000-0000-000000000351', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000331', 'CS601', 'Compiler Design', 4.0),
    ('00000000-0000-0000-0000-000000000352', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000331', 'CS602', 'Computer Networks', 4.0),
    ('00000000-0000-0000-0000-000000000353', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000331', 'CS603', 'Artificial Intelligence', 3.0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. FACULTY & STUDENT PROFILES
-- ============================================================================
-- Faculty Profiles
INSERT INTO public.faculty_profiles (id, institution_id, department_id, employee_code, designation, date_of_joining)
VALUES 
    ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000301', 'FAC-CS-001', 'Associate Professor', '2021-07-01'),
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000301', 'FAC-CS-002', 'Assistant Professor', '2023-01-15')
ON CONFLICT (id) DO NOTHING;

-- Student Profiles
INSERT INTO public.student_profiles (id, institution_id, department_id, programme_id, current_semester_id, current_section_id, enrolment_no, roll_no, admission_date, cgpa, sgpa, status)
VALUES 
    ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000331', '00000000-0000-0000-0000-000000000341', 'EN2023CSE042', '23CSE042', '2023-08-01', 8.75, 8.90, 'active'),
    ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000331', '00000000-0000-0000-0000-000000000341', 'EN2023CSE043', '23CSE043', '2023-08-01', 7.80, 8.10, 'active'),
    ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000312', '00000000-0000-0000-0000-000000000332', '00000000-0000-0000-0000-000000000342', 'EN2023PSU101', '23PSU101', '2023-08-01', 8.20, 8.40, 'active')
ON CONFLICT (id) DO NOTHING;

-- Teaching Assignments
-- Faculty A1 is assigned to CS601, Section A
-- Faculty A2 is assigned to CS602, Section A
INSERT INTO public.teaching_assignments (id, institution_id, faculty_id, subject_id, section_id, academic_session_id, is_primary)
VALUES 
    ('00000000-0000-0000-0000-000000000361', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000351', '00000000-0000-0000-0000-000000000341', '00000000-0000-0000-0000-000000000321', true),
    ('00000000-0000-0000-0000-000000000362', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000352', '00000000-0000-0000-0000-000000000341', '00000000-0000-0000-0000-000000000321', true)
ON CONFLICT (subject_id, section_id, faculty_id) DO NOTHING;

-- ============================================================================
-- 5. GRADING SCALES & ASSESSMENTS
-- ============================================================================
INSERT INTO public.grading_scales (id, institution_id, name, effective_from, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', 'UGC 10-Point Scale', '2025-01-01', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.grading_scale_tiers (scale_id, grade, grade_points, min_percentage, max_percentage, description)
VALUES 
    ('00000000-0000-0000-0000-000000000401', 'O',  10.0, 90.00, 100.00, 'Outstanding'),
    ('00000000-0000-0000-0000-000000000401', 'A+',  9.0, 80.00,  89.99, 'Excellent'),
    ('00000000-0000-0000-0000-000000000401', 'A',   8.0, 70.00,  79.99, 'Very Good'),
    ('00000000-0000-0000-0000-000000000401', 'B+',  7.0, 60.00,  69.99, 'Good'),
    ('00000000-0000-0000-0000-000000000401', 'B',   6.0, 50.00,  59.99, 'Above Average'),
    ('00000000-0000-0000-0000-000000000401', 'C',   5.0, 40.00,  49.99, 'Pass'),
    ('00000000-0000-0000-0000-000000000401', 'F',   0.0,  0.00,  39.99, 'Fail')
ON CONFLICT (scale_id, grade) DO NOTHING;

-- Assessments (published, submitted, and draft)
INSERT INTO public.assessments (id, institution_id, teaching_assignment_id, name, type, max_marks, weightage_percent, status, grading_scale_id, published_at)
VALUES 
    ('00000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000361', 'Mid-Term Exam', 'midterm', 50.00, 30.00, 'published', '00000000-0000-0000-0000-000000000401', NOW()),
    ('00000000-0000-0000-0000-000000000412', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000361', 'End-Term Theory', 'final_theory', 100.00, 50.00, 'submitted', '00000000-0000-0000-0000-000000000401', NULL),
    ('00000000-0000-0000-0000-000000000413', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000361', 'Quiz 1', 'assignment', 20.00, 10.00, 'draft', '00000000-0000-0000-0000-000000000401', NULL)
ON CONFLICT (id) DO NOTHING;

-- Assessment Results
INSERT INTO public.assessment_results (id, institution_id, assessment_id, student_id, marks_obtained, grade, grade_points, is_absent)
VALUES 
    ('00000000-0000-0000-0000-000000000421', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000030', 44.50, 'A+', 9.0, false),
    ('00000000-0000-0000-0000-000000000422', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000031', 37.00, 'A', 8.0, false),
    ('00000000-0000-0000-0000-000000000423', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000412', '00000000-0000-0000-0000-000000000030', 88.00, 'A+', 9.0, false),
    ('00000000-0000-0000-0000-000000000424', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000412', '00000000-0000-0000-0000-000000000031', 75.00, 'A', 8.0, false),
    ('00000000-0000-0000-0000-000000000425', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000413', '00000000-0000-0000-0000-000000000030', 18.00, 'O', 10.0, false)
ON CONFLICT (assessment_id, student_id) DO NOTHING;

-- ============================================================================
-- 6. ATTENDANCE SESSIONS & RECORDS
-- ============================================================================
INSERT INTO public.attendance_sessions (id, institution_id, teaching_assignment_id, session_date, slot_number, status, opened_at, submitted_at, revision_count)
VALUES 
    ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000361', '2026-03-01', 1, 'submitted', NOW(), NOW(), 1),
    ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000361', '2026-03-02', 1, 'scheduled', NULL, NULL, 0)
ON CONFLICT (teaching_assignment_id, session_date, slot_number) DO NOTHING;

INSERT INTO public.attendance_records (id, institution_id, session_id, student_id, status)
VALUES 
    ('00000000-0000-0000-0000-000000000511', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000030', 'Present'),
    ('00000000-0000-0000-0000-000000000512', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000031', 'Absent')
ON CONFLICT (session_id, student_id) DO NOTHING;

-- ============================================================================
-- 7. FEE STRUCTURES, ASSIGNMENTS & PAYMENTS
-- ============================================================================
INSERT INTO public.fee_structures (id, institution_id, programme_id, semester_id, name, amount_minor_units, due_date)
VALUES 
    ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000331', 'Semester 6 Academic & Lab Fee', 7500000, '2026-03-31')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fee_assignments (id, institution_id, fee_structure_id, student_id, assigned_amount_minor_units, concession_amount_minor_units)
VALUES 
    ('00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000030', 7500000, 500000)
ON CONFLICT (fee_structure_id, student_id) DO NOTHING;

INSERT INTO public.fee_payments (id, institution_id, student_id, fee_assignment_id, amount_minor_units, payment_method, gateway_reference, status, idempotency_key, verified_at)
VALUES 
    ('00000000-0000-0000-0000-000000000621', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000611', 4000000, 'UPI', 'UPI-REF-20260301-9988', 'verified', 'IDEMP-PAY-001', NOW())
ON CONFLICT (institution_id, idempotency_key) DO NOTHING;

-- ============================================================================
-- 8. LEAVE REQUESTS
-- ============================================================================
INSERT INTO public.leave_requests (id, institution_id, student_id, start_date, end_date, reason, status)
VALUES 
    ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', '2026-03-10', '2026-03-12', 'Medical Leave: Viral Fever', 'submitted')
ON CONFLICT (id) DO NOTHING;
