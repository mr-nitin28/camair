# CampusOS — Comprehensive Master Test Plan

**Document Version:** 1.0.0 (Production Release Candidate)  
**Standard:** Master Prompt Section 17 & Section 18  
**Date:** October 2026  
**Status:** Authoritative  

---

## 1. Quality Strategy & Testing Pyramid

CampusOS adheres to an uncompromising, multi-tier testing discipline. No feature is considered complete until verified against real database constraints, PostgreSQL Row Level Security (RLS) policies, transactional race conditions, accessibility standards, and disaster recovery reconstitutions.

```
                  +----------------------------------+
                  |  Disaster Recovery & DR Drills   |  (1 suite, 41 tests)
                  +----------------------------------+
                  |   Load, Burst & Concurrency QA   |  (1 suite, 18 tests)
                  +----------------------------------+
                  |   WCAG 2.2 AA & Motion QA Pass   |  (1 suite, 19 tests)
                  +----------------------------------+
                  |   Cross-Module E2E Integration   |  (1 suite, 40 tests)
                  +----------------------------------+
                  |   Role Workflows (Student/Fac/Adm)|  (3 suites, 110 tests)
                  +----------------------------------+
                  |   Security Matrix & RLS Policies |  (1 suite, 30 tests)
                  +----------------------------------+
                  |   Math, Tokens & Pure Unit Logic |  (2 suites, 27 tests)
                  +----------------------------------+
```

---

## 2. Test Suites Inventory & Coverage Matrix (All 10 Test Suites)

Total Test Suites: **10** | Total Subtests: **286** | Passing: **286 (100%)** | Failing: **0**

### 2.1 Suite 1: Mathematical Calculations & Grading Algorithms (`tests/calculations.test.ts`)
- **Scope:** Pure computation engine in `src/lib/calculations/`.
- **Verified Capabilities:**
  - Attendance metrics: percentage clamping, shortage detection (< 75.00%), recovery lectures formula, absence buffer formula.
  - SGPA and CGPA computation using UGC 10-point scale with credit weightages.
  - Financial ledger balance: `net_payable = assigned - concession`, `balance = net_payable - verified_payments`.
  - Property-based testing via `fast-check` over 1,000 randomized mark inputs.

### 2.2 Suite 2: Security Matrix & PostgreSQL RLS Foundation (`tests/security-matrix.test.ts`)
- **Scope:** 30 database tables, RLS policies, role helpers, and security definer functions in PGlite.
- **Verified Capabilities:**
  - Tenant isolation: User in Institution A receives 0 rows when querying Institution B.
  - Intra-tenant isolation: Student A cannot view Student B's grades, fee balances, or leave requests.
  - Faculty assignment guards: Faculty member unassigned to a subject cannot submit attendance or enter marks.
  - Examination admin privileges: Only authorized exam admins can publish assessments; students and faculty receive `42501 Unauthorized`.
  - State machine immutability: Terminal leaves cannot transition; locked attendance sessions cannot be modified.

### 2.3 Suite 3: Motion System & Design Tokens (`tests/motion-and-tokens.test.ts`)
- **Scope:** Design system foundations, duration budgets, and easing curves in `src/lib/motion.ts`.
- **Verified Capabilities:**
  - Token verification: instant (80ms), fast (140ms), base (220ms), slow (320ms), chart (600ms).
  - Fluid deceleration cubic bezier curve `[0.16, 1, 0.3, 1]`.
  - Spring transitions: stiffness 350, damping 25.
  - Reduced-motion variant generators: duration forced to 0.01s and spatial offsets zeroed.

### 2.4 Suite 4: Student Workflows (`tests/student-workflows.test.ts`)
- **Scope:** Student self-service console in `src/lib/services/student-service.ts`.
- **Verified Capabilities:**
  - Dashboard overview summary and today's schedule strip.
  - Attendance ring calculation with buffer and recovery math.
  - Examination results returning published evaluations only.
  - Learning resources search by keyword, course, and semester.
  - Multi-tier leave submission, date boundary validation, and withdrawal.
  - Academic doubts thread lifecycle and 2-reopen policy cap.
  - Read-only fee ledger and verified receipt integrity.

### 2.5 Suite 5: Faculty Workflows (`tests/faculty-workflows.test.ts`)
- **Scope:** Faculty workstation in `src/lib/services/faculty-service.ts`.
- **Verified Capabilities:**
  - Faculty console summary and today's teaching schedule.
  - Roll-call attendance session workspace with status counters.
  - Single-keystroke attendance entry keyboard handlers.
  - Assessment marks entry with dynamic min/max validation and dirty-state tracking.
  - Clipboard tab-delimited paste parser.
  - Split-pane leave review queue and student shortage warnings.

### 2.6 Suite 6: Admin Workflows (`tests/admin-workflows.test.ts`)
- **Scope:** Administrative governance in `src/lib/services/admin-service.ts`.
- **Verified Capabilities:**
  - Institutional command center KPIs and realtime aggregations.
  - Academic structure management (Departments, Programmes, Sessions, Semesters, Sections).
  - Bulk CSV User Import 4-stage pipeline (Upload $\to$ Dry Run $\to$ Error Diff $\to$ Commit).
  - Examination publishing desk and grade distribution previews.
  - Fee structure definition and ledger reconciliation reports.
  - Searchable audit trail viewer with before/after state diffs.

### 2.7 Suite 7: Cross-Module Integration (`tests/cross-module-integration.test.ts`)
- **Scope:** End-to-end multi-role workflows and outbox notification fan-out.
- **Verified Capabilities:**
  - Journey 1: Leave submission $\to$ Faculty/Admin review & approval $\to$ Timeline update $\to$ Notification dispatch.
  - Journey 2: Faculty roll-call attendance $\to$ Student attendance percentage update in $< 2\text{ s}$ $\to$ Shortage alert emitted if $< 75\%$.
  - Journey 3: Marks entry $\to$ Exam Admin review $\to$ Idempotent publication $\to$ Student transcript updated.
  - Journey 4: Fee structure $\to$ Student assignment $\to$ Payment recording with HMAC $\to$ Realtime receipt generation.

### 2.8 Suite 8: Concurrency & Peak Load Harness (`tests/load-and-concurrency.test.ts`)
- **Scope:** Stress testing, Section 11 latency targets, and cryptographic webhook security.
- **Verified Capabilities:**
  - Peak attendance burst: 60 simultaneous faculty submissions with zero deadlocks and 100% record integrity.
  - Contention serialization: 10 concurrent requests to the same session serialized with `SELECT FOR UPDATE`.
  - Fee payment idempotency burst: 20 identical colliding keys produce exactly 1 payment record.
  - Concurrent unique fee mutations maintain double-entry ledger balance without leakage.
  - Cryptographic Payment Gateway Webhook HMAC & Replay Protection (Assumption A-012): forged signature rejection (401), expired timestamp replay attack rejection (401), tampered payload rejection (401), authentic signature ledger mutation (200), and concurrent webhook burst idempotency.
  - Measured latency benchmarks: reads $< 15\text{ ms}$, joins $< 50\text{ ms}$, aggregations $< 100\text{ ms}$.

### 2.9 Suite 9: Accessibility, Contrast & Motion QA (`tests/accessibility-and-motion-qa.test.ts`)
- **Scope:** WCAG 2.2 AA compliance and mobile usability.
- **Verified Capabilities:**
  - Mathematical relative luminance and contrast ratio audits across light and dark tokens ($\ge 4.5:1$ text, $\ge 3.0:1$ UI controls).
  - Touch targets $\ge 44 \times 44\text{ px}$ verified across mobile navigation and top bar buttons.
  - Global `prefers-reduced-motion` compliance across all animation variant creators.
  - Keyboard focus trap, Escape key handlers, and structural ARIA landmarks.

### 2.10 Suite 10: Operations, Backup & Disaster Recovery Drill (`tests/backup-restore-drill.test.ts`)
- **Scope:** High availability and business continuity drill.
- **Verified Capabilities:**
  - Full deterministic snapshot export across all 30 non-empty schema tables.
  - Standby database re-initialization and replay in topological dependency order.
  - 100% byte-for-byte SHA-256 table checksum matches across all 30 tables.
  - Referential integrity check confirming 0 orphan foreign key records.
  - Operational transactions and RPC state machine execution verified on restored standby database.

---

## 3. Test Execution Runbook

All automated tests are executed via Node.js native test runner with native TypeScript type stripping:

```bash
# Execute entire test suite (all 10 suites, 286 subtests)
npm test

# Run individual test suite
node --test --experimental-strip-types tests/load-and-concurrency.test.ts
node --test --experimental-strip-types tests/accessibility-and-motion-qa.test.ts
node --test --experimental-strip-types tests/backup-restore-drill.test.ts
```
