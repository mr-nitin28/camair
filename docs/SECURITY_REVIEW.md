# CampusOS — Comprehensive Security & Compliance Review

**Document Version:** 1.0.0 (Production Release Candidate)  
**Standard:** Master Prompt Section 17 & Section 18  
**Date:** October 2026  
**Status:** Authoritative  

---

## 1. Security Architecture & Threat Model

CampusOS employs a **defense-in-depth** security architecture. Security boundaries are established not in application code or client state, but directly inside the PostgreSQL database engine via cryptographic session claims, Row Level Security (RLS), and security-definer helper routines.

```
+-------------------------------------------------------------------------+
| Client Tier (Next.js 15 App Router)                                    |
| Role-specific layouts, navigation guards, zero client-calculated auth   |
+-----------------------------------+-------------------------------------+
                                    | TLS 1.3 / Strict-Transport-Security
+-----------------------------------v-------------------------------------+
| Edge Routing & Middleware Guard (`src/middleware.ts`)                   |
| JWT signature validation, session cookie inspection, 307 redirects      |
+-----------------------------------+-------------------------------------+
                                    | PostgREST / Authenticated Sessions
+-----------------------------------v-------------------------------------+
| Database Tier (PostgreSQL / Supabase RLS)                               |
| 30 Tables with RLS ENABLED, `institution_id` isolation, private schema  |
| helpers (`current_institution_id()`, `has_role()`, `has_any_role()`)    |
+-----------------------------------+-------------------------------------+
                                    | RPC State Machines & Audit Trails
+-----------------------------------v-------------------------------------+
| Transactional State Machines & Immutable Audit Logs                     |
| `SELECT FOR UPDATE` locking, HMAC webhook checks, `audit_events` outbox |
+-------------------------------------------------------------------------+
```

---

## 2. Multi-Tenant Isolation & Row Level Security (RLS)

All 30 schema tables enforce Row Level Security (`relrowsecurity = true`). Tenant boundaries are governed by the tenant discriminator column `institution_id` and verified via private helper routines:

### 2.1 Private Schema Security Helpers
- `private.current_institution_id()`: Derives the user's institution ID directly from their active `user_roles` record using `auth.uid()`.
- `private.has_role(p_role app_role)`: Returns true if the calling user holds the specified role in their current institution.
- `private.has_any_role(p_roles app_role[])`: Returns true if the calling user holds any role in the provided list.

### 2.2 RLS Policy Categories

1. **Institutional Tenancy Isolation:**
   ```sql
   CREATE POLICY "Users can only view data within their institution"
   ON public.student_profiles FOR SELECT TO authenticated
   USING (institution_id = (SELECT private.current_institution_id()) OR private.has_role('Super Admin'));
   ```
2. **Student Intra-Tenant Privacy:**
   - A student can only view their own user profile, attendance records, exam results, leave requests, and fee ledgers (`student_id = auth.uid()`).
   - Querying another student's ID returns 0 rows.
3. **Faculty Subject Assignment Enforcement:**
   - Faculty can only view rosters and enter marks/attendance for subjects explicitly assigned to them in `public.teaching_assignments`.
4. **Administrative Scoping:**
   - Department Admins are restricted to their assigned department.
   - Finance Admins can view/record fee ledgers but cannot publish examination marks.
   - Examination Admins can publish assessment results but cannot mutate financial structures.

---

## 3. Threat Matrix & Vulnerability Assessment

| Threat / Attack Vector | Severity | Mitigation Architecture | Verification Method |
| :--- | :---: | :--- | :--- |
| **Cross-Tenant Data Leakage** | CRITICAL | Shared database with `institution_id` discriminator locked by PostgreSQL RLS. Cross-tenant queries return 0 rows. | Automated test in `tests/security-matrix.test.ts` querying Tenant B with Tenant A session. |
| **Broken Object Level Auth (BOLA / IDOR)** | CRITICAL | Student data queries enforce `student_id = auth.uid()` at the database level. Client cannot request arbitrary records by UUID. | Verified Student A cannot query Student B's fee or attendance records. |
| **Client-Side Role Elevation** | HIGH | Client cookies or `localStorage` modifications are ignored by the backend. Auth roles derived server-side via `auth.uid()`. | Next.js Edge middleware validates signed JWT tokens on every route. |
| **Race Conditions in Ledger Payments** | HIGH | Payment recording RPC executes `SELECT ... FOR UPDATE` on the fee assignment row and checks unique `idempotency_key`. | Concurrent burst test (20 identical calls, 10 unique calls) in `tests/load-and-concurrency.test.ts`. |
| **Attendance Tampering Post-Deadline** | HIGH | Attendance sessions automatically transition to `locked` after 48 hours. Updates to locked sessions throw `ATTENDANCE_SESSION_LOCKED`. | Automated test asserting locked session rejection in `tests/security-matrix.test.ts`. |
| **Payment Spoofing via Return URLs** | CRITICAL | Payment verification requires asynchronous server-side HMAC SHA-256 webhook verification. Client return URLs never alter balances (Assumption A-012). | Verified via `src/lib/services/payment-webhook-service.ts` in `tests/load-and-concurrency.test.ts`. |
| **SQL Injection (SQLi)** | HIGH | 100% parameterized queries in PostgREST and typed PL/pgSQL stored procedures with static `SET search_path = public, pg_temp`. | Code audit confirmed zero dynamic string concatenation in SQL queries. |
| **Denial of Service (DoS) via Bulk Import** | MEDIUM | Multi-stage import pipeline: lexical validation $\to$ dry-run simulation $\to$ atomic commit. Maximum 1,000 rows per batch. | Bulk import tests in `tests/admin-workflows.test.ts`. |

---

## 4. Privacy & Regulatory Compliance (DPDP Act 2023 & GDPR)

CampusOS is designed to comply with India's **Digital Personal Data Protection (DPDP) Act 2023** and EU **General Data Protection Regulation (GDPR)**:

1. **Data Minimization & Purpose Limitation:** Student records capture only educationally essential data (Name, Email, Enrollment Number, Department, Section). Sensitive personal data is never stored without explicit consent.
2. **Right to Data Portability:** Students can download their complete academic and financial transcript as structured, digitally verifiable JSON and PDF exports.
3. **Storage Limitation & Soft Deletion:** In accordance with educational compliance standards, academic transcripts and attendance logs are retained immutably. Soft deletion (`status = 'withdrawn'`) is utilized rather than hard deletion to maintain audit validity (Assumption A-011).
4. **Tamper-Evident Audit Logging:** All sensitive administrative modifications (attendance overrides, mark changes, fee concessions, role grants) are recorded in `public.audit_events` capturing actor ID, timestamp, entity ID, and before/after state diffs.

---

## 5. Cryptography & Key Management

- **Data in Transit:** TLS 1.3 enforced across all web and database endpoints. HSTS enabled with `max-age=31536000; includeSubDomains; preload`.
- **Data at Rest:** Transparent Database Encryption (AES-256) at the storage block layer.
- **Session Tokens:** Signed JWT tokens using asymmetric ES256 / RS256 algorithms. Cookie storage uses `HttpOnly`, `Secure`, `SameSite=Lax`.
- **Payment Webhooks:** Cryptographic HMAC SHA-256 signature verification using server-side secrets.
