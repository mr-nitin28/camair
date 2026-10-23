# CampusOS — Workflow & State Machine Specifications

**Document Version:** 1.0.0 (Production Release Candidate)  
**Standard:** Master Prompt Section 17 & Section 18  
**Date:** October 2026  
**Status:** Authoritative  

---

## 1. Overview & Architectural Principles

All critical state changes in CampusOS are governed by formal transactional state machines. Every workflow adheres to the following core architectural rules:

1. **Row-Level Concurrency Control:** All state transitions lock target rows using `SELECT ... FOR UPDATE` within PostgreSQL stored procedures (RPCs) to prevent race conditions.
2. **Role & Tenant Enforcement:** Transitions verify `auth.uid()`, institutional tenancy, and the caller's active role.
3. **Immutable Audit Trails:** Transitions atomically insert a record into `public.audit_events` capturing `actor_id`, `actor_role`, `action`, `before_state`, and `after_state`.
4. **Asynchronous Notification Outbox:** Valid transitions insert an event into `public.notification_outbox` for reliable, durable background processing.
5. **Idempotency Protection:** Financial mutations and high-frequency updates accept an `idempotency_key` ensuring duplicate requests produce identical outcomes without duplicate mutations.

---

## 2. Attendance Session State Machine

### 2.1 State Diagram
```
+---------------+      Faculty Opens Session      +---------------+
|   scheduled   | -----------------------------> |     open      |
+---------------+                                +---------------+
                                                         |
                                                         | Faculty Submits Marks/Records
                                                         | (creates revision snapshot)
                                                         v
+---------------+    48h Window or Admin Lock    +---------------+
|    locked     | <----------------------------- |   submitted   |
+---------------+                                +---------------+
        ^                                                |
        |                Admin Correction                |
        +------------------------------------------------+
```

### 2.2 Transition Matrix

| Current State | Target State | Triggering Actor | Required Preconditions | State Side-Effects |
| :--- | :--- | :--- | :--- | :--- |
| `scheduled` | `open` | Assigned Faculty / Academic Admin | Session date is reached; slot is active | Sets `opened_at = NOW()` |
| `open` | `submitted` | Assigned Faculty | Roster records provided ($N > 0$) | Upserts `attendance_records`, increments `revision_count`, logs `attendance_revisions`, queues `ATTENDANCE_SUBMITTED` outbox |
| `submitted` | `submitted` | Assigned Faculty | Within 48-hour window (Assumption A-006) | Updates records, increments `revision_count`, logs new revision snapshot |
| `submitted` | `locked` | System Timer / Academic Admin | 48 hours elapsed post-submission OR manual admin lock | Sets `locked_at = NOW()`. Session becomes immutable to faculty |
| `locked` | `submitted` | Academic Admin Only | Formal audit justification provided | Increments `revision_count`, logs administrative override in audit trail |

---

## 3. Student Leave Request State Machine

### 3.1 State Diagram
```
                +---------------+
                |     draft     |
                +---------------+
                        |
                        | Student Submits (validates dates & reason >= 15 chars)
                        v
                +---------------+
    +---------> |   submitted   | <-------------------------+
    |           +---------------+                           |
    |                   |                                   |
    |                   +------------+                      |
    |                   |            |                      |
    | Faculty Reviews   |            | Student Withdraws    | Student Provides Clarification
    | (> 3 days)        v            v                      |
    |           +--------------+  +---------------+         |
    |           | under_review |  |   withdrawn   | (TERM)   |
    |           +--------------+  +---------------+         |
    |                   |                                   |
    |                   v                                   |
    |           +-------------------------+                 |
    +---------- | clarification_requested | ----------------+
                +-------------------------+
                        |
                        +-------------------+
                        |                   |
                        | Faculty/Admin     | Faculty/Admin
                        | Approves          | Rejects
                        v                   v
                +---------------+   +---------------+
                |   approved    |   |   rejected    | (TERM)
                +---------------+   +---------------+
```

### 3.2 Transition Matrix & Invariants

| Current State | Target State | Actor | Validation Rules & Preconditions |
| :--- | :--- | :--- | :--- |
| `draft` | `submitted` | Student Owner | `start_date <= end_date`, `length(reason) >= 15` |
| `submitted` | `withdrawn` | Student Owner Only | Request is not yet resolved. Sets `withdrawn_at = NOW()` |
| `submitted` | `under_review` | Faculty Proctor | Leave duration $> 3$ days (escalated to HOD per Assumption A-008) |
| `submitted` / `under_review` | `clarification_requested` | Faculty / Admin | Non-empty `clarification_comment` required |
| `clarification_requested` | `submitted` | Student Owner | Student submits updated response or documentation |
| `submitted` / `under_review` | `approved` | Faculty / Admin | Non-empty `decision_comment` required; generates approved leave calendar entry |
| `submitted` / `under_review` | `rejected` | Faculty / Admin | Non-empty `decision_comment` required explaining reason for rejection |

*Terminal State Guard:* Once a leave request enters `approved`, `rejected`, or `withdrawn`, no further status transitions are permitted.

---

## 4. Assessment & Examination Results State Machine

### 4.1 State Diagram
```
+---------------+     Faculty Enters & Saves Draft Marks     +---------------+
|     draft     | -----------------------------------------> |     draft     |
+---------------+                                            +---------------+
        |
        | Faculty Completes Entry & Submits Assessment
        v
+---------------+             Exam Admin Reviews             +---------------+
|   submitted   | -----------------------------------------> |   reviewed    |
+---------------+                                            +---------------+
        |                                                            |
        | Exam Admin Rejects / Requests Correction                   | Exam Admin Publishes
        v                                                            v
+--------------------+                                       +---------------+
| correction_pending |                                       |   published   | (IDEMPOTENT)
+--------------------+                                       +---------------+
        |                                                            |
        | Faculty Corrects Marks & Resubmits                         | Student Visibility Enabled
        +------------------------------------------------------------+ Transcripts Computed
```

### 4.2 Publication Rules & Student Visibility Invariants
1. **Student Gate:** Student portals and transcripts execute queries with `WHERE status = 'published'`. No draft or unreviewed marks are ever returned.
2. **Publication Precondition:** An assessment cannot be published unless it is in `submitted` or `reviewed` state and contains at least 1 student result.
3. **Idempotent Publication:** Re-calling `rpc_publish_assessment_results` on an already published assessment returns `is_duplicate: true` without error or side-effects.
4. **Outbox Event:** Upon successful transition to `published`, an event `ASSESSMENT_PUBLISHED` is written to `public.notification_outbox`.

---

## 5. Financial Ledger & Fee Payment State Machine

### 5.1 Ledger Double-Entry Invariant
For any student fee assignment, the mathematical ledger invariant must hold at all times:
$$\text{Assigned Amount} - \text{Concession Amount} - \sum \text{Verified Payments} = \text{Remaining Balance}$$
$$\text{Balance} \ge 0 \quad (\text{Overpayments are tracked as unallocated credits, never negative balance})$$

### 5.2 Payment Transaction State Diagram
```
+---------------+
|   initiated   | (Client triggers checkout with idempotency_key)
+---------------+
        |
        +-----------------------+-----------------------+
        |                       |                       |
        | Gateway Webhook       | Gateway Webhook       | User Cancels /
        | Signature Verified    | Signature Failed      | Session Expires
        v                       v                       v
+---------------+       +---------------+       +---------------+
|   verified    |       |    failed     |       |   cancelled   |
+---------------+       +---------------+       +---------------+
        |
        | Refund Approved & Processed
        v
+---------------+
|   refunded    |
+---------------+
```

### 5.3 Idempotency Collision Handling
When a concurrent or duplicate payment request arrives with a previously recorded `idempotency_key`:
1. The transaction intercepts the key in `public.fee_payments(institution_id, idempotency_key)`.
2. It returns the existing `payment_id` and status with `is_duplicate: true`.
3. Zero new payment rows are created, and the student's ledger balance remains completely unaffected.

---

## 6. Academic Doubt Lifecycle

### 6.1 State Diagram
```
+---------------+     Faculty Posts Answer     +---------------+
|     open      | ---------------------------> |   answered    |
+---------------+                              +---------------+
        ^                                              |
        | Student Reopens                              | Student Accepts / 7-Day Inactivity
        | (Max 2 times within 7 days)                  v
        |                                      +---------------+
        +------------------------------------- |   resolved    |
                                               +---------------+
```

### 6.2 Reopen Policy Enforcement
- If `reopen_count < 2` and `NOW() - resolved_at <= 7 days`: State transitions to `open`; `reopen_count` incremented; faculty notified.
- If `reopen_count >= 2` or `7 days` elapsed: Reopen is rejected with `DOUBT_REOPEN_LIMIT_EXCEEDED` (Assumption A-009). The student must file a new doubt.

---

## 7. Bulk User Data Import Pipeline

### 7.1 Pipeline Flow
```
[ Upload CSV File ]
        |
        v
[ Step 1: Lexical & Header Validation ] ---> (Syntax Error: abort with line number)
        |
        v
[ Step 2: Dry-Run Validation ]
  - Verify uniqueness of emails and enrollment numbers
  - Check foreign key validity (department, programme, section)
  - Accumulate validation errors and warnings
        |
        v
[ Step 3: Interactive Diff Modal ]
  - Displays proposed inserts, updates, and duplicate collision warnings
  - Administrator confirms execution
        |
        v
[ Step 4: Atomic Database Transaction ]
  - BEGIN TRANSACTION
  - Batch insert user_profiles, user_roles, student_profiles / faculty_profiles
  - Write audit log entry
  - COMMIT TRANSACTION
```
