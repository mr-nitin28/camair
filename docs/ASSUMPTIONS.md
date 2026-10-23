# CampusOS — Assumption Registry

**Standard:** Master Prompt Section 1.1 ("Record every assumption as A-001, A-002, … in docs/ASSUMPTIONS.md with the reason and how to verify it. When an institutional policy is ambiguous, make it configurable instead of guessing.")  
**Date:** October 2026

---

## Registry of Architectural & Policy Assumptions

### A-001: Multi-Tenancy Architecture via Row Level Security (RLS)
* **Domain:** Database Architecture & Tenant Isolation
* **Assumption:** Multi-tenancy will be implemented using a shared database with discriminator column `institution_id` on all institutional tables, enforced strictly via PostgreSQL Row Level Security (RLS) policies and security-definer helper functions, rather than separate database schemas or separate physical databases.
* **Rationale:** Supabase connection pooling and serverless connection limits make single-database multi-tenancy the most performant and cost-effective approach for early pilot deployments up to 50 institutions.
* **Configurability:** Tenant configuration (name, code, currency, timezone, grading scale) is stored per `institutions` record.
* **Verification Method:** Multi-tenant automated tests querying with User A (Institution 1) asserting 0 rows returned for Institution 2 data.

---

### A-002: Currency & Financial Storage Convention
* **Domain:** Finance & Fee Ledgers
* **Assumption:** All financial figures are stored as 64-bit integers (`BIGINT`) representing minor currency units (e.g., paise in INR, cents in USD), never as floating point numbers (`FLOAT` or `DOUBLE`).
* **Rationale:** Floating-point arithmetic introduces rounding inaccuracies that violate strict accounting standards.
* **Configurability:** Currency code (default `INR`) and locale format are configured at the institution level.
* **Verification Method:** Property-based tests verifying ledger reconciliation equality: `balance == assigned - concessions - verified_payments`.

---

### A-003: Timezone Handling & Timestamp Standards
* **Domain:** Temporal Data & Academic Calendars
* **Assumption:** All database timestamps are stored in UTC (`TIMESTAMPTZ`). Academic calendar dates without times (e.g., semester start, holiday) use the SQL `DATE` type. Client displays format UTC timestamps to the institution's designated timezone.
* **Rationale:** Ensures cross-timezone accuracy while preventing DST drift.
* **Configurability:** `timezone` column in `institutions` table (e.g., `Asia/Kolkata`).
* **Verification Method:** Unit test verifying an attendance session opened at `2026-06-25T03:30:00Z` renders correctly as `09:00 AM IST`.

---

### A-004: Attendance Thresholds & Shortage Rules
* **Domain:** Academic Policy
* **Assumption:** The default threshold for attendance warning/shortage is 75.00%, but this must be configurable per institution and per programme.
* **Rationale:** Regulatory bodies (e.g. UGC/AICTE in India) specify 75%, but autonomous universities may set 80% or 70%.
* **Configurability:** Stored in `institution_policies.attendance_threshold_percent`.
* **Verification Method:** Automated test verifying that when threshold is adjusted to 80%, a student with 76% attendance is flagged with a shortage warning.

---

### A-005: Versioned Grading Scales & Cutoffs
* **Domain:** Examination & Evaluation
* **Assumption:** Grading scales (letter grades, grade points, percentage cutoff tiers) are versioned records linked to academic sessions, rather than hardcoded global constants. A student's published result must retain the grade points defined under the policy active at the time of publication.
* **Rationale:** Academic councils update grading curves periodically (e.g., shifting from a 10-point scale to a 4-point scale, or modifying distinction boundaries). Historical results must never change retrospectively when grading rules are updated.
* **Configurability:** `grading_scales` and `grading_scale_tiers` tables with `effective_from` dates.
* **Verification Method:** Changing a grading tier from 90% to 85% for an "A+" grade only alters unpublished or newly calculated assessments; historical published results remain unchanged.

---

### A-006: Attendance Correction Window & Immutability
* **Domain:** Attendance State Machine
* **Assumption:** Faculty may correct attendance records within a configurable time window (default 48 hours post-submission). After the window expires, the attendance session is permanently `locked`, and corrections can only be made by an Academic Admin with a documented audit justification.
* **Rationale:** Prevents post-hoc manipulation of attendance records prior to examinations while allowing reasonable time for typo corrections.
* **Configurability:** `institution_policies.attendance_correction_window_hours`.
* **Verification Method:** Test asserting that a faculty member attempting to update an attendance session after 49 hours receives an `ATTENDANCE_SESSION_LOCKED` error.

---

### A-007: Examination Eligibility Gating (Fee Clearance & Attendance)
* **Domain:** Examination Administration
* **Assumption:** Eligibility to sit for examinations (and download hall tickets) requires satisfying both minimum attendance thresholds and complete fee clearance, but either or both gates can be disabled per institution.
* **Rationale:** Some private institutions strictly enforce fee clearance before exam entry; public institutions often separate fee collection from examination rights.
* **Configurability:** Flags `fee_clearance_required_for_exam` and `attendance_clearance_required_for_exam` in `institution_policies`.
* **Verification Method:** Test verifying a student with pending fee balance is blocked from exam registration when policy is TRUE, and permitted when policy is FALSE.

---

### A-008: Leave Request Approval Routing
* **Domain:** Student Workflow
* **Assumption:** Student leave requests route first to the student's assigned Faculty Advisor / Proctor. If the leave exceeds 3 consecutive days, secondary approval by the Department Head is required.
* **Rationale:** Standard multi-tier academic approval hierarchy.
* **Configurability:** Configurable routing rules in `institution_policies` (`leave_multi_tier_days_threshold`).
* **Verification Method:** Test verifying a 2-day leave request finalizes on Faculty approval, while a 4-day leave request transitions to `under_review` pending HOD action.

---

### A-009: Academic Doubts Escalation & Reopen Window
* **Domain:** Mentorship & Communication
* **Assumption:** A student may reopen a resolved doubt at most 2 times (default) within a 7-day window. After 2 reopens or 7 days, a new doubt must be filed.
* **Rationale:** Prevents endless argument loops and abandoned conversation threads.
* **Configurability:** `institution_policies.doubt_reopen_limit` and `doubt_reopen_window_days`.
* **Verification Method:** Test asserting that a 3rd attempt to reopen a resolved doubt is rejected with `DOUBT_REOPEN_LIMIT_EXCEEDED`.

---

### A-010: CamAI Feature Scope (Phase Exemption)
* **Domain:** Artificial Intelligence & LLM Features
* **Assumption:** All AI chat assistants, LLM fine-tuning, RAG, and automated summarization features (the `/dashboard/camai` and `/faculty/camai` screens) are non-goals for this Phase 0/Phase 1 pilot delivery, as mandated by Section 0 of the Master Prompt.
* **Rationale:** The immediate priority is establishing core security, data integrity, attendance, grading, and finance engines.
* **Configurability:** CamAI route items can be disabled or hidden in the navigation bar using a feature flag `ENABLE_CAMAI=false`.
* **Verification Method:** Navigation bar hides CamAI links when feature flag is disabled.

---

### A-011: Soft Deletion & Audit Retention
* **Domain:** Compliance & Data Retention
* **Assumption:** Academic records, student profiles, fee transactions, and grades are never hard deleted from the database. Soft deletion (`archived_at` or `status = 'withdrawn'`) is utilized.
* **Rationale:** Educational regulatory compliance mandates long-term record preservation (e.g. 5 to 10 years).
* **Configurability:** Data retention policies documented in `docs/DATABASE_AND_DATA_FLOW.md`.
* **Verification Method:** Database `DELETE` statements on student profiles or fee records are intercepted by foreign key `ON DELETE RESTRICT` constraints or policy triggers.

---

### A-012: Payment Gateway & Webhook Signature Verification
* **Domain:** Financial Integrations
* **Assumption:** For the production pilot, payment receipts are only marked `verified` upon asynchronous server-side verification of payment gateway webhooks (e.g. Razorpay, Stripe) using cryptographic HMAC signatures, never upon browser redirect return URLs.
* **Rationale:** Client-side redirect URLs can be easily spoofed, creating fraudulent payment records.
* **Configurability:** Webhook secret and active gateway provider stored in server environment variables.
* **Verification Method:** Test asserting that unverified webhook payloads or tampered signatures result in `HTTP 401 Unauthorized` and do not alter student fee balances.

---

### A-013: Assessment Weightage & Evaluation Policy Normalization
* **Domain:** Examination & Academic Evaluation
* **Assumption:** Course assessments are categorized into internal, midterm, and final components whose aggregate weightages must sum to 100.0%. Raw marks awarded are normalized to letter grades and grade points strictly using the institution's active versioned grading scale tier.
* **Rationale:** Transparent degree evaluation eliminates discrepancy between raw assessment scores and published SGPA/CGPA transcripts.
* **Configurability:** Grading scales, component tiers, and passing criteria configured per institution in `grading_scales` and `grading_scale_tiers`.
* **Verification Method:** Automated tests verifying that unpublished assessments cannot be viewed by students, and published results compute SGPA/CGPA with zero rounding drift.

---

### A-014: Disaster Recovery Point Objective (RPO) and Recovery Time Objective (RTO)
* **Domain:** Operations & Business Continuity
* **Assumption:** Production disaster recovery standards mandate a Recovery Point Objective (RPO) of $\le 1$ hour and a Recovery Time Objective (RTO) of $\le 15$ minutes. Automated snapshots and WAL journaling allow full reconstitution of all 30 relational tables without data corruption.
* **Rationale:** Academic operations during peak periods (e.g., examination result publication, semester fee deadlines) require immediate failover capabilities.
* **Configurability:** Snapshot frequency, replication targets, and WAL archival retention stored in database infrastructure configuration.
* **Verification Method:** Programmatic backup-restore drill `tests/backup-restore-drill.test.ts` asserting 100% byte-for-byte SHA-256 table parity and 0 orphan foreign key records across all 30 tables.

---

### A-015: DPDP Act 2023 & GDPR Privacy Isolation and Student Data Subject Rights
* **Domain:** Data Privacy & Legal Compliance
* **Assumption:** Student Personally Identifiable Information (PII) including emails, phone numbers, academic transcripts, and financial records must be strictly isolated at the PostgreSQL storage engine level via Row Level Security (RLS). Cross-student data leakage is treated as a critical security violation.
* **Rationale:** Compliance with India's Digital Personal Data Protection (DPDP) Act 2023 and EU GDPR mandates strict tenant and user confidentiality.
* **Configurability:** Privacy retention windows, consent logging, and audit tracking configured in `institution_policies`.
* **Verification Method:** Security matrix tests `tests/security-matrix.test.ts` verifying that peer students cannot read each other's grades, fee balances, or leave requests.

