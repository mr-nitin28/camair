# CampusOS — Product Requirements Document (PRD)

**Document Version:** 1.0.0 (Production Release Candidate)  
**Standard:** Master Prompt Section 17 & Section 18  
**Date:** October 2026  
**Status:** Authoritative  

---

## 1. System Vision & Persona Overview

CampusOS is a light-speed, enterprise-grade, multi-tenant Campus Management System engineered for modern universities, colleges, and polytechnics. The platform eliminates administrative latency, manual paper workflows, and data silos across three core operational personas:

1. **Student Persona:** Self-service console for academic tracking, live attendance rings with buffer calculations, read-only double-entry fee ledgers, verifiable receipts, multi-tier leave submissions, structured academic doubts, and learning vaults.
2. **Faculty Persona:** High-density command workstation featuring single-keystroke roll-call attendance grids, Excel/CSV paste-compatible examination marks entry with inline validation, split-pane leave approval desks, and course performance analytics.
3. **Administrator Persona (6 Roles):** Governance hub offering real-time institutional KPIs, dry-run transactional bulk CSV user imports, academic curricula and section configurations, cryptographic examination publishing desks, double-entry fee reconciliations, and searchable immutable audit logs.

---

## 2. Student Portal Functional Requirements

### 2.1 Overview Dashboard (`/dashboard`)
* **Objective:** Give the student immediate situational awareness within 2 seconds of login.
* **Functional Requirements:**
  - **Student Header:** Renders full name, enrollment number, roll number, department, enrolled semester, and profile avatar.
  - **Today Strip:** Displays chronological schedule of classes for the current day with room numbers, faculty names, and status indicators (Completed, In Progress, Upcoming).
  - **Attendance Ring Widget:** Renders institutional attendance percentage against the configurable threshold (default 75.00%). Displays recovery classes needed if below threshold, or safe absence buffer if above threshold.
  - **Fee Status Tile:** Displays outstanding ledger balance formatted in INR minor units with due date and payment button.
  - **Academic Standing Tile:** Displays current SGPA and cumulative CGPA with credit completion progress bar.

### 2.2 Attendance Console (`/dashboard/attendance`)
* **Functional Requirements:**
  - Subject-wise breakdown displaying total conducted sessions, attended sessions, absent sessions, and duty leave / medical adjustments.
  - Attendance simulation calculator: allows students to project future attendance percentage by toggling anticipated attendance over the next $N$ lectures.
  - Itemized session history logs with timestamps, faculty name, slot number, and verification status.

### 2.3 Academic Marks & Exam Transcripts (`/dashboard/exams`, `/dashboard/performance`)
* **Functional Requirements:**
  - Displays published internal assessments, mid-terms, and final exam results.
  - Enforces publication gate: only assessments marked `published` by Examination Admin are displayed. Draft or submitted evaluations remain hidden.
  - Displays normalized letter grades, grade points, and semester credit calculations.
  - Semester-by-semester SGPA and CGPA trend progression chart with credit weightages.

### 2.4 Learning Resources Vault (`/dashboard/notes`)
* **Functional Requirements:**
  - Searchable handout repository filtered by subject, semester, faculty contributor, and document type.
  - Direct download links for approved course syllabi, lecture slides, and laboratory manuals.

### 2.5 Student Leave Requests (`/dashboard/leaves`)
* **Functional Requirements:**
  - Multi-type leave submission: Medical, Duty / On-Duty, Academic, Personal.
  - Validation: Start date must be $\le$ end date; reason must be at least 15 characters; optional file attachments (medical certificates).
  - Real-time attendance risk projection indicating post-leave attendance percentage.
  - State machine progression: `draft` $\to$ `submitted` $\to$ (`under_review` | `clarification_requested`) $\to$ (`approved` | `rejected` | `withdrawn`).
  - Student can withdraw submitted leaves prior to final faculty/admin approval.

### 2.6 Academic Doubt Clearing (`/dashboard/doubts`)
* **Functional Requirements:**
  - Threaded academic question submission targeted to assigned course faculty.
  - Status lifecycle: `open` $\to$ `answered` $\to$ `resolved` $\to$ `reopened`.
  - Institutional reopen policy enforcement: maximum 2 reopens within a 7-day window (Assumption A-009).

### 2.7 Read-Only Fee Ledger (`/dashboard/fees`)
* **Functional Requirements:**
  - Itemized semester fee schedule (Tuition, Laboratory, Library, Examination).
  - Strict double-entry ledger displaying assigned amount, institutional concessions, verified payments, and remaining balance.
  - Downloadable digitally verifiable PDF fee receipts with transaction reference numbers.
  - Zero client-side fee mutation; all balances computed from verified database transactions.

---

## 3. Faculty Portal Functional Requirements

### 3.1 Faculty Console & Schedule (`/faculty`, `/faculty/classes`)
* **Functional Requirements:**
  - Faculty profile strip: designation, department, employee code, cabin location, and teaching assignments.
  - Today's teaching schedule with instant deep-link to active roll-call session workspace.
  - Action task queue: unsubmitted attendance sessions, pending leave reviews, and open student doubts.

### 3.2 High-Speed Roll-Call Attendance Grid (`/faculty/attendance`)
* **Functional Requirements:**
  - Keyboard roll-call navigation: `P` for Present, `A` for Absent, `L` for Late, `E` for Excused, Down arrow for next student.
  - Bulk actions: "Mark All Present", "Invert Attendance", "Clear All".
  - Multi-session concurrency protection: session row locked via `SELECT FOR UPDATE` upon submission.
  - 48-hour faculty correction window (Assumption A-006); sessions lock permanently after expiration.
  - Audit trail logging and immutable version snapshot creation on every submission.

### 3.3 Examination Marks Entry Desk (`/faculty/exams`)
* **Functional Requirements:**
  - Subject-wise and section-wise student roster with numeric marks inputs.
  - Dynamic min/max bounds validation ($0 \le \text{marks} \le \text{max\_marks}$).
  - Excel/CSV clipboard paste parser supporting tab-delimited columns.
  - Pre-submission diff modal highlighting modified marks before committing to database.
  - Status progression: `draft` $\to$ `submitted` (sent to Examination Admin for review).

### 3.4 Leave Approval Queue (`/faculty/leaves`)
* **Functional Requirements:**
  - Split-pane review interface: left pane displays applicant list sorted by urgency; right pane displays application details.
  - Student attendance shortage warning badge flagged if student attendance is $< 75\%$.
  - Actions: Approve, Reject, Request Clarification, or Forward to Department Head (for leaves $> 3$ days per Assumption A-008).
  - Decision comments required for approvals and rejections.

---

## 4. Administrator Portal Functional Requirements

### 4.1 Institutional Command Center (`/admin`)
* **Functional Requirements:**
  - Real-time KPI summary: total enrolled students, active faculty, overall attendance rate, collected fees, and open approvals.
  - Quick action shortcuts: Create Academic Cycle, Run Bulk Import, Publish Assessment, Audit Log Search.

### 4.2 Academic Curricula & Hierarchy (`/admin/departments`, `/admin/courses`)
* **Functional Requirements:**
  - Department, Programme, Session, Semester, Section, and Subject configuration.
  - Faculty teaching assignment matrix (Subject $\leftrightarrow$ Section $\leftrightarrow$ Faculty).
  - Validation: no duplicate codes, date constraints ($end\_date > start\_date$), capacity bounds.

### 4.3 Student & Faculty Registries (`/admin/students`, `/admin/faculty`)
* **Functional Requirements:**
  - Searchable, sortable, virtualized tabular registries.
  - Bulk CSV Import with 4-stage pipeline:
    1. File Upload & CSV Schema Parsing.
    2. Dry-Run Validation (catches duplicate roll numbers, invalid emails, non-existent sections).
    3. Error Diff Report with line-numbered corrective feedback.
    4. Transactional Atomic Commit.

### 4.4 Examination Publication Desk (`/admin/exams`)
* **Functional Requirements:**
  - Review queue of faculty-submitted assessments with grade distribution bell-curve previews.
  - Idempotent assessment publication RPC: transitions assessment from `submitted` to `published`.
  - Enforces publication gate: cannot publish draft assessments or assessments with 0 recorded student marks.
  - Triggers asynchronous outbox notification to all enrolled students upon publication.

### 4.5 Financial Hub & Ledger Reconciliations (`/admin/fees`)
* **Functional Requirements:**
  - Fee structure definition per programme and semester.
  - Student fee assignments with concession management.
  - Idempotent fee payment recording with gateway transaction references and HMAC verification.
  - Ledger reconciliation summary: Total Assessed = Concessions + Verified Collections + Outstanding Receivables.

### 4.6 Governance, Audit & Security (`/admin/audit-logs`, `/admin/security`, `/admin/settings`)
* **Functional Requirements:**
  - Searchable audit log viewer capturing actor ID, role, action, target entity, timestamp, and JSON before/after state diffs.
  - RBAC role assignment desk supporting 8 distinct institutional roles.
  - Institutional policy settings: attendance threshold percent, correction window hours, grading scale versions, and currency codes.

---

## 5. Non-Functional Requirements & Performance SLAs

1. **Page Load Budget:** Every route First Load JS must remain $\le 200\text{ kB}$ (gzipped).
2. **Database Query SLAs:**
   - Single-row reads: $p95 < 15\text{ ms}$.
   - List queries with multi-table joins: $p95 < 50\text{ ms}$.
   - Complex aggregate queries: $p95 < 100\text{ ms}$.
3. **Concurrency & Resilience:** Platform must handle 60 simultaneous faculty attendance submissions with zero deadlocks and 0 duplicate payment creations under concurrent idempotency collisions.
4. **Accessibility:** 100% compliance with WCAG 2.2 AA standards (contrast $\ge 4.5:1$, mobile touch targets $\ge 44 \times 44\text{ px}$, and full reduced-motion support).
