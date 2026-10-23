# CampusOS — Role-Based Access Control (RBAC) & Permission Matrix

**Governing Directive:** Master Prompt Section 2 & Phase 1 Exit Criteria  
**Standard:** Strict Multi-Tenant Isolation, Deny-by-Default, Cryptographic Audit Trail  
**Date:** October 2026  
**Status:** Implemented & Verified  

---

## 1. System Roles Taxonomy

CampusOS implements an 8-role hierarchical and domain-partitioned authorization model. Roles are scoped to a specific `institution_id` with foreign key enforcement to ensure cross-institution isolation.

| # | Role Identifier | Canonical Name | Domain Responsibility |
|---|----------------|----------------|-----------------------|
| 1 | `Super Admin` | System / Platform Administrator | Global platform operations, institution onboarding, cross-tenant disaster recovery |
| 2 | `Institution Admin` | Institution Chief Administrator | Full control over institutional parameters, campuses, policies, staff, and audit trails |
| 3 | `Academic Admin` | Dean / Registrar / Academic Officer | Curricula, departments, programmes, sessions, semesters, sections, teaching assignments |
| 4 | `Examination Admin` | Controller of Examinations | Grading scale definitions, assessment review, cryptographic marks publication, transcripts |
| 5 | `Finance Admin` | Bursar / Chief Financial Officer | Fee structures, scholarship/concession assignments, payment gateway reconciliation |
| 6 | `Department Admin` | Head of Department (HOD) | Department-level faculty assignments, course allocation, student leave dispute resolution |
| 7 | `Faculty` | Professor / Lecturer / Proctor | Attendance recording, internal assessment grading, student doubt replies, leave proctoring |
| 8 | `Student` | Enrolled Learner | Personal attendance view, leave request submission, fee ledger payments, doubt asking |

---

## 2. Global Security Invariants

1. **Deny-by-Default:** Every table has Row Level Security (RLS) enabled. Unless explicitly granted by a policy, all `SELECT`, `INSERT`, `UPDATE`, `DELETE` operations fail with zero rows returned or violation errors.
2. **Strict Institution Scoping:** All operations are strictly evaluated against the actor's verified institution (`private.current_institution_id()`). Cross-institution reads and writes are rejected at the database engine level.
3. **No Service-Role Bypass in Client Code:** Frontend and API routes exclusively use authenticated sessions. Administrative actions use role-checked RPCs.
4. **Append-Only Auditing:** Destructive or high-impact actions (attendance locks, exam publication, payment verifications, role grants) automatically generate immutable rows in `public.audit_events`.
5. **Session-Cached Helper Functions:** All RLS policies query private schema helper functions with `(SELECT auth.uid())` subquery wrapping to ensure PostgreSQL query planner executes the lookup once per statement rather than per row.

---

## 3. Comprehensive Permission Matrix

### Legend
- **C:** Create / Insert
- **R:** Read / Select (Scoped)
- **R*:** Read / Select (Unrestricted within Institution)
- **U:** Update / Edit
- **D:** Delete / Soft Delete
- **A:** Approve / State Transition Action
- **—:** No Access (Deny)

### 3.1 Core Architecture & Identity

| Entity / Resource | Super Admin | Inst Admin | Academic Admin | Exam Admin | Finance Admin | Dept Admin | Faculty | Student |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `institutions` | CRUD | R* / U | R* | R* | R* | R* | R* | R* |
| `campuses` | CRUD | CRUD | R* | R* | R* | R* | R* | R* |
| `user_profiles` | CRUD | CRUD | R* | R* | R* | R* | R* | Self (R/U) |
| `user_roles` | CRUD | CRUD | R* | — | — | — | — | — |
| `institution_policies`| CRUD | CRUD | R* | R* | R* | R* | R* | R* |
| `audit_events` | R* | R* | — | — | — | — | — | — |

### 3.2 Academic Structure & Registration

| Entity / Resource | Super Admin | Inst Admin | Academic Admin | Exam Admin | Finance Admin | Dept Admin | Faculty | Student |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `departments` | CRUD | CRUD | CRUD | R* | R* | R* / U | R* | R* |
| `programmes` | CRUD | CRUD | CRUD | R* | R* | R* | R* | R* |
| `academic_sessions`| CRUD | CRUD | CRUD | R* | R* | R* | R* | R* |
| `semesters` | CRUD | CRUD | CRUD | R* | R* | R* | R* | R* |
| `sections` | CRUD | CRUD | CRUD | R* | R* | R* | R* | R* |
| `subjects` | CRUD | CRUD | CRUD | R* | R* | R* | R* | R* |
| `faculty_profiles` | CRUD | CRUD | CRUD | R* | — | R* | Self (R/U) | R (Public) |
| `student_profiles` | CRUD | CRUD | CRUD | R* | R* | R* | Assigned (R) | Self (R) |
| `teaching_assignments`| CRUD | CRUD | CRUD | R* | — | CRUD | Assigned (R) | Enrolled (R)|

### 3.3 Attendance Engine

| Entity / Resource | Super Admin | Inst Admin | Academic Admin | Exam Admin | Finance Admin | Dept Admin | Faculty | Student |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `attendance_sessions`| CRUD | CRUD | CRUD | R* | — | R* | Assigned (CRU)| Enrolled (R)|
| `attendance_records` | CRUD | CRUD | CRUD | R* | — | R* | Assigned (CRU)| Self (R) |
| `attendance_revisions`| R* | R* | R* | R* | — | R* | Assigned (C/R)| — |
| *Lock / Unlock Session* | YES | YES | YES | — | — | — | Window (48h) | — |

*Note:* Faculty can only record attendance for sessions mapped to their own `teaching_assignments`. Direct record mutations outside `rpc_submit_attendance_session` are denied by RLS.

### 3.4 Examination & Grading Engine

| Entity / Resource | Super Admin | Inst Admin | Academic Admin | Exam Admin | Finance Admin | Dept Admin | Faculty | Student |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `grading_scales` | CRUD | CRUD | R* | CRUD | — | R* | R* | R* |
| `grading_scale_tiers`| CRUD | CRUD | R* | CRUD | — | R* | R* | R* |
| `assessments` | CRUD | CRUD | R* | CRUD / A | — | R* | Assigned (CRU)| Published (R)|
| `assessment_results`| CRUD | CRUD | R* | CRUD / A | — | R* | Assigned (CRU)| Published Self (R)|
| *Publish Marks RPC* | YES | YES | — | YES | — | — | — | — |

*Note:* Students can only view assessment results once `assessments.status = 'published'`. Draft or submitted internal marks are completely invisible to students.

### 3.5 Finance & Fee Ledger

| Entity / Resource | Super Admin | Inst Admin | Academic Admin | Exam Admin | Finance Admin | Dept Admin | Faculty | Student |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `fee_structures` | CRUD | CRUD | R* | — | CRUD | — | — | Enrolled (R)|
| `fee_assignments` | CRUD | CRUD | — | — | CRUD | — | — | Self (R) |
| `fee_payments` | CRUD | CRUD | — | — | CRUD / Verify | — | — | Self (C/R) |
| *Verify Payment RPC*| YES | YES | — | — | YES | — | — | — |

*Note:* Double-entry payments require an `idempotency_key` unique per institution to prevent duplicate card or UPI charges.

### 3.6 Workflows: Leaves, Doubts & Notifications

| Entity / Resource | Super Admin | Inst Admin | Academic Admin | Exam Admin | Finance Admin | Dept Admin | Faculty | Student |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `leave_requests` | CRUD | CRUD | R* | — | — | Review/A | Assigned Review/A | Self (CRU/Withdraw)|
| `doubts` | CRUD | CRUD | — | — | — | R* | Assigned (RU) | Self (CRU/Reopen) |
| `doubt_messages` | CRUD | CRUD | — | — | — | R* | Assigned (CR) | Participant (CR)|
| `notifications` | CRUD | CRUD | — | — | — | — | Self (RU) | Self (RU) |
| `notification_outbox`| CRUD | R* | — | — | — | — | — | — |

---

## 4. Helper Function Specifications (`private` schema)

The security enforcement layer is backed by high-performance PL/pgSQL helper functions in the non-exposed `private` schema:

1. `private.current_institution_id() RETURNS UUID`:
   Resolves the authenticated user's `institution_id` from `public.user_profiles` based on `(SELECT auth.uid())`.
2. `private.has_role(p_role public.app_role) RETURNS BOOLEAN`:
   Returns true if the authenticated user possesses the specified role within their active institution.
3. `private.has_any_role(p_roles public.app_role[]) RETURNS BOOLEAN`:
   Returns true if the user possesses at least one of the specified roles (or is Super Admin).
4. `private.is_assigned_faculty(p_teaching_assignment_id UUID) RETURNS BOOLEAN`:
   Returns true if the current user is the faculty assigned to the given teaching assignment.
5. `private.is_self_student(p_student_id UUID) RETURNS BOOLEAN`:
   Returns true if `p_student_id` belongs to the authenticated user.
6. `private.get_student_id_for_user(p_user_id UUID) RETURNS UUID`:
   Retrieves student profile UUID for a given user UUID.
7. `private.get_faculty_id_for_user(p_user_id UUID) RETURNS UUID`:
   Retrieves faculty profile UUID for a given user UUID.

---

## 5. State Machine Security Transitions

| State Machine | Initial State | Allowed Actor | Transition Function | Target State | Guards |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Attendance Session** | `scheduled` | Assigned Faculty | `rpc_submit_attendance_session` | `submitted` | Row lock `FOR UPDATE`, assignment verification |
| **Attendance Session** | `submitted` | Admin / Faculty | `rpc_submit_attendance_session` | `submitted` / `locked` | Reason required in `attendance_revisions` |
| **Leave Request** | `submitted` | Assigned Proctor | `rpc_transition_leave_request` | `under_review` | Actor matches assigned department/proctor |
| **Leave Request** | `under_review` | Assigned Proctor | `rpc_transition_leave_request` | `approved` / `rejected` | Mandatory decision comment |
| **Leave Request** | `submitted` | Student Owner | `rpc_transition_leave_request` | `withdrawn` | Can only withdraw before final decision |
| **Assessment** | `draft` | Assigned Faculty | `rpc_publish_assessment_results`| `submitted` | All student marks entered & validated |
| **Assessment** | `submitted` | Exam Admin | `rpc_publish_assessment_results`| `published` | Verifies grade scale compliance & emits audit log |
| **Fee Payment** | `initiated` | Student / Gateway | `rpc_record_fee_payment` | `verified` | Unique `idempotency_key`, balance verification |
