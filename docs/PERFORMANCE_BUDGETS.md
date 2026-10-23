# CampusOS — Performance Budgets & Latency Benchmarks

**Document Version:** 1.0.0 (Production Release Candidate)  
**Standard:** Master Prompt Section 11 & Section 18  
**Date:** October 2026  
**Status:** Authoritative  

---

## 1. Performance Philosophy & Budget Architecture

In CampusOS, performance is treated as an immutable feature. Every route, database query, and animation is governed by strict, automated engineering budgets enforced in continuous integration.

### Core Budget Directives:
1. **First Load JS Budget:** Maximum **200 kB** First Load JS (gzipped) for any user-facing route. Shared shell must not exceed **120 kB**.
2. **Database Query SLAs:**
   - Single-row primary-key reads: $p95 < 15\text{ ms}$.
   - Complex list queries with multi-table joins: $p95 < 50\text{ ms}$.
   - Analytical aggregate computations: $p95 < 100\text{ ms}$.
3. **Core Web Vitals Targets:**
   - Largest Contentful Paint (LCP): $\le 2.0\text{ s}$ on standard 4G mobile.
   - Interaction to Next Paint (INP): $\le 100\text{ ms}$.
   - Cumulative Layout Shift (CLS): $\le 0.05$.
   - First Contentful Paint (FCP): $\le 1.0\text{ s}$.
4. **Motion System Budget:** Micro-interactions $\le 140\text{ ms}$; page transitions $\le 220\text{ ms}$; zero motion under `prefers-reduced-motion`.

---

## 2. First Load JS Bundle Measurements (All 46 User-Facing Routes)

*Measurement Date:* October 2026 | *Build Tool:* Next.js 15.5.19 Production Optimizer | *Enforcement Script:* `scripts/check-bundle-budget.mjs`

### 2.1 Shared Baseline
- **Shared First Load JS across all routes:** **102.0 kB** (Compliant with $\le 120\text{ kB}$ shell target)
  - `chunks/1255-b8cf77ab14370e57.js`: 46.0 kB (React 19 & Next.js core)
  - `chunks/4bd1b696-100b9d70ed4e49c1.js`: 54.2 kB (UI primitives & icons)
  - Other shared chunks: 2.22 kB

### 2.2 Complete Per-Route Size Inventory & Compliance History

| Route | Phase 0 Baseline | Phase 2 Optimized | Phase 7 Final | Budget Target | Margin | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/` | 103 kB | 103.0 kB | 103.0 kB | $\le 200\text{ kB}$ | +97.0 kB | ✅ PASS |
| `/_not-found` | 103 kB | 103.0 kB | 103.0 kB | $\le 200\text{ kB}$ | +97.0 kB | ✅ PASS |
| `/login` | 147 kB | 151.0 kB | 151.0 kB | $\le 200\text{ kB}$ | +49.0 kB | ✅ PASS |
| `/design-system` | 179 kB | 179.0 kB | 179.0 kB | $\le 200\text{ kB}$ | +21.0 kB | ✅ PASS |
| `/dashboard` | 151 kB | 187.0 kB | 187.0 kB | $\le 200\text{ kB}$ | +13.0 kB | ✅ PASS |
| `/dashboard/activities` | 124 kB | 141.0 kB | 141.0 kB | $\le 200\text{ kB}$ | +59.0 kB | ✅ PASS |
| `/dashboard/announcements`| 122 kB | 139.0 kB | 139.0 kB | $\le 200\text{ kB}$ | +61.0 kB | ✅ PASS |
| `/dashboard/attendance` | 165 kB | 185.0 kB | 185.0 kB | $\le 200\text{ kB}$ | +15.0 kB | ✅ PASS |
| `/dashboard/camai` | 129 kB | 160.0 kB | 160.0 kB | $\le 200\text{ kB}$ | +40.0 kB | ✅ PASS |
| `/dashboard/doubts` | 152 kB | 189.0 kB | 189.0 kB | $\le 200\text{ kB}$ | +11.0 kB | ✅ PASS |
| `/dashboard/exams` | 123 kB | 140.0 kB | 140.0 kB | $\le 200\text{ kB}$ | +60.0 kB | ✅ PASS |
| `/dashboard/fees` | 165 kB | 187.0 kB | 187.0 kB | $\le 200\text{ kB}$ | +13.0 kB | ✅ PASS |
| `/dashboard/leaves` | 153 kB | 190.0 kB | 190.0 kB | $\le 200\text{ kB}$ | +10.0 kB | ✅ PASS |
| `/dashboard/notes` | 151 kB | 186.0 kB | 186.0 kB | $\le 200\text{ kB}$ | +14.0 kB | ✅ PASS |
| `/dashboard/performance` | 123 kB | 140.0 kB | 140.0 kB | $\le 200\text{ kB}$ | +60.0 kB | ✅ PASS |
| `/dashboard/service-desk` | 108 kB | 110.0 kB | 110.0 kB | $\le 200\text{ kB}$ | +90.0 kB | ✅ PASS |
| `/dashboard/settings` | 107 kB | 110.0 kB | 110.0 kB | $\le 200\text{ kB}$ | +90.0 kB | ✅ PASS |
| `/faculty` | 124 kB | 141.0 kB | 141.0 kB | $\le 200\text{ kB}$ | +59.0 kB | ✅ PASS |
| `/faculty/announcements` | 152 kB | 185.0 kB | 185.0 kB | $\le 200\text{ kB}$ | +15.0 kB | ✅ PASS |
| `/faculty/assignments` | 154 kB | 190.0 kB | 190.0 kB | $\le 200\text{ kB}$ | +10.0 kB | ✅ PASS |
| `/faculty/attendance` | 171 kB | 193.0 kB | 193.0 kB | $\le 200\text{ kB}$ | +7.0 kB | ✅ PASS |
| `/faculty/camai` | 129 kB | 160.0 kB | 160.0 kB | $\le 200\text{ kB}$ | +40.0 kB | ✅ PASS |
| `/faculty/classes` | 107 kB | 109.0 kB | 109.0 kB | $\le 200\text{ kB}$ | +91.0 kB | ✅ PASS |
| `/faculty/doubts` | 126 kB | 143.0 kB | 143.0 kB | $\le 200\text{ kB}$ | +57.0 kB | ✅ PASS |
| `/faculty/exams` | 170 kB | 191.0 kB | 191.0 kB | $\le 200\text{ kB}$ | +9.0 kB | ✅ PASS |
| `/faculty/groups` | 152 kB | 188.0 kB | 188.0 kB | $\le 200\text{ kB}$ | +12.0 kB | ✅ PASS |
| `/faculty/leaves` | 126 kB | 143.0 kB | 143.0 kB | $\le 200\text{ kB}$ | +57.0 kB | ✅ PASS |
| `/faculty/messages` | 108 kB | 110.0 kB | 110.0 kB | $\le 200\text{ kB}$ | +90.0 kB | ✅ PASS |
| `/faculty/notes` | 153 kB | 188.0 kB | 188.0 kB | $\le 200\text{ kB}$ | +12.0 kB | ✅ PASS |
| `/faculty/performance` | **231 kB (FAIL)** | 124.0 kB | 124.0 kB | $\le 200\text{ kB}$ | +76.0 kB | ✅ PASS |
| `/faculty/settings` | 116 kB | 119.0 kB | 119.0 kB | $\le 200\text{ kB}$ | +81.0 kB | ✅ PASS |
| `/faculty/students` | 124 kB | 141.0 kB | 141.0 kB | $\le 200\text{ kB}$ | +59.0 kB | ✅ PASS |
| `/admin` | **281 kB (FAIL)** | 191.0 kB | 191.0 kB | $\le 200\text{ kB}$ | +9.0 kB | ✅ PASS |
| `/admin/approvals` | 167 kB | 192.0 kB | 192.0 kB | $\le 200\text{ kB}$ | +8.0 kB | ✅ PASS |
| `/admin/attendance` | **235 kB (FAIL)** | 128.0 kB | 128.0 kB | $\le 200\text{ kB}$ | +72.0 kB | ✅ PASS |
| `/admin/audit-logs` | 122 kB | 188.0 kB | 188.0 kB | $\le 200\text{ kB}$ | +12.0 kB | ✅ PASS |
| `/admin/communications` | 167 kB | 190.0 kB | 190.0 kB | $\le 200\text{ kB}$ | +10.0 kB | ✅ PASS |
| `/admin/courses` | 170 kB | 190.0 kB | 190.0 kB | $\le 200\text{ kB}$ | +10.0 kB | ✅ PASS |
| `/admin/departments` | 170 kB | 193.0 kB | 193.0 kB | $\le 200\text{ kB}$ | +7.0 kB | ✅ PASS |
| `/admin/documents` | 122 kB | 123.0 kB | 123.0 kB | $\le 200\text{ kB}$ | +77.0 kB | ✅ PASS |
| `/admin/exams` | 169 kB | 192.0 kB | 192.0 kB | $\le 200\text{ kB}$ | +8.0 kB | ✅ PASS |
| `/admin/faculty` | 170 kB | 193.0 kB | 193.0 kB | $\le 200\text{ kB}$ | +7.0 kB | ✅ PASS |
| `/admin/fees` | 168 kB | 192.0 kB | 192.0 kB | $\le 200\text{ kB}$ | +8.0 kB | ✅ PASS |
| `/admin/security` | 113 kB | 190.0 kB | 190.0 kB | $\le 200\text{ kB}$ | +10.0 kB | ✅ PASS |
| `/admin/settings` | 124 kB | 191.0 kB | 191.0 kB | $\le 200\text{ kB}$ | +9.0 kB | ✅ PASS |
| `/admin/students` | 172 kB | 194.0 kB | 194.0 kB | $\le 200\text{ kB}$ | +6.0 kB | ✅ PASS |

**Compliance Summary:** 46 of 46 routes (100%) strictly satisfy the $\le 200\text{ kB}$ First Load JS threshold. All 3 initial Phase 0 budget violations (`/admin`, `/admin/attendance`, `/faculty/performance`) were permanently remediated via dynamic lazy loading of heavy visualization dependencies.

---

## 3. Database Latency SLA Verification

*Source:* Automated Benchmark Test Suite `tests/load-and-concurrency.test.ts` (50 iterations per operation class)

| Query Category | Section 11 SLA Target | Measured Mean | Measured p50 | Measured p95 | Measured p99 | Budget Margin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Single-Row Read** (e.g. Student Profile by UUID) | $< 15\text{ ms}$ | $0.62\text{ ms}$ | $0.48\text{ ms}$ | $1.92\text{ ms}$ | $2.84\text{ ms}$ | **+13.08 ms** |
| **Relational List Query** (e.g. Roster with Attendance & Fees Join) | $< 50\text{ ms}$ | $2.41\text{ ms}$ | $2.10\text{ ms}$ | $6.48\text{ ms}$ | $9.82\text{ ms}$ | **+43.52 ms** |
| **Analytical Aggregations** (e.g. Institutional Attendance & Fee Totals) | $< 100\text{ ms}$ | $1.02\text{ ms}$ | $0.91\text{ ms}$ | $2.44\text{ ms}$ | $4.11\text{ ms}$ | **+97.56 ms** |

---

## 4. Concurrency & Throughput Benchmarks

| Stress Scenario | Scale / Concurrency | Execution Duration | Effective Throughput | Error / Deadlock Rate | Record Integrity |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Faculty Attendance Burst** | 60 simultaneous submissions | $132.6\text{ ms}$ | $452.5\text{ req/s}$ | **0.00%** (0 deadlocks) | 120/120 records created |
| **Same-Session Contention** | 10 concurrent requests to 1 session | $19.2\text{ ms}$ | $520.8\text{ req/s}$ | **0.00%** | Serialized to rev 11 |
| **Fee Payment Idempotency Burst** | 20 identical colliding keys | $25.1\text{ ms}$ | $796.8\text{ req/s}$ | **0.00%** | Exactly 1 payment created |
| **Concurrent Unique Fee Payments** | 10 distinct payments on 1 assignment | $26.2\text{ ms}$ | $381.7\text{ req/s}$ | **0.00%** | Balance maintained exact |

---

## 5. Continuous Integration Enforcement

Automated enforcement is wired into the root `package.json` and executed before every release build:
```bash
# Bundle Size CI Gate
npm run budget:check

# Full Performance & Concurrency SLA Gate
node --test --experimental-strip-types tests/load-and-concurrency.test.ts
```
Any route exceeding 200 kB or any query p95 exceeding the SLA terminates the CI build with exit code 1.
