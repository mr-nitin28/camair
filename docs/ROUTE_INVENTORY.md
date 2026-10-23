# CampusOS — Complete Route Inventory & Surface Analysis

**Total Routes Analyzed:** 47 (45 Application routes + `/` redirect + `/_not-found`)  
**Architecture:** Next.js 15.5.19 App Router  
**Audit Date:** October 2026

---

## 1. Route Inventory Overview

Every route in the CampusOS application was audited against the following dimensions:
1. **Module & Layout Hierarchy**
2. **Rendering Model** (`'use client'` vs Server Component)
3. **Authentication & Authorization Guard**
4. **Data Fetching Source & Strategy**
5. **State Handling** (Loading, Empty, Error, Permission-Denied)
6. **Bundle Size & First Load JS**
7. **Identified Defects & Production Gaps**

---

## 2. Authentication & Root Endpoints

### 2.1 `/` (Root Entry Point)
- **File:** `src/app/page.tsx`
- **Module:** Root / Routing
- **Layout:** `src/app/layout.tsx`
- **Rendering Model:** `'use client'`
- **Bundle Metrics:** 361 B Route Size | 103 kB First Load JS
- **Current Behavior:** Immediately executes `useEffect(() => router.push('/dashboard'), [])`.
- **Defects & Gaps:** Blind redirect to student dashboard without checking user session or role. Authenticated faculty or admins visiting `/` are momentarily redirected to `/dashboard` before getting redirected again. Should be a Server Component reading the Supabase auth session cookie and performing an immediate 307 redirect to the role-specific workspace.

### 2.2 `/login` (Unified Authentication Portal)
- **File:** `src/app/login/page.tsx`
- **Module:** Authentication
- **Layout:** `src/app/layout.tsx`
- **Rendering Model:** `'use client'`
- **Bundle Metrics:** 5.2 kB Route Size | 147 kB First Load JS
- **Current Behavior:** Form with mock email/password validation and three "Quick Demo Login" buttons (Student, Faculty, Admin). Saves `mock_user_role` to `localStorage` and pushes to `/dashboard`, `/faculty`, or `/admin`.
- **Defects & Gaps:** Does not use Supabase Auth SDK. No server-side session cookies set. No password recovery flow, invitation redemption flow, rate limiting, or CSRF tokens.

### 2.3 `/_not-found` (Global 404 Handler)
- **File:** Next.js Internal Static Fallback
- **Module:** System Fallback
- **Layout:** `src/app/layout.tsx`
- **Bundle Metrics:** 1 kB Route Size | 103 kB First Load JS
- **Defects & Gaps:** Uses default unstyled Next.js 404 page. Needs custom branded 404 screen adhering to design tokens with quick navigation back to the active user's role workspace.

---

## 3. Student Module (`/dashboard/*`)

**Parent Layout:** `src/app/dashboard/layout.tsx`  
**Layout Characteristics:** Client-rendered layout (`'use client'`). Loads hardcoded student profile (`Aarav Sharma`) into Zustand `useAppStore` in `useEffect`. Manages mock notification dropdown and collapsible navigation.

### 3.1 `/dashboard` (Student Home Console)
- **File:** `src/app/dashboard/page.tsx`
- **Bundle:** 5.43 kB | 151 kB First Load JS
- **Data Source:** Hardcoded stats in component and Zustand store.
- **States:** No loading skeletons, no error boundaries, no empty states.
- **Defects:** Attendance percentage is hardcoded to 88.5%; fee balance hardcoded; CGPA/SGPA hardcoded. Does not derive values from authoritative attendance logs or fee ledgers.

### 3.2 `/dashboard/attendance` (Student Attendance Tracker)
- **File:** `src/app/dashboard/attendance/page.tsx`
- **Bundle:** 4.13 kB | **217 kB First Load JS (BUDGET FAIL: +17 kB)**
- **Data Source:** In-file array `mockAttendanceLog` and `mockSubjects`.
- **States:** Has subject filter, but no loading state (renders instantly with static data).
- **Defects:** Violates JS bundle budget due to direct import of `recharts`. Attendance calculation contains hardcoded subject overrides (e.g., `if (sub.code === 'CS-601') present = 11`). Missing institutional threshold marker ring.

### 3.3 `/dashboard/performance` (Academic Performance & CGPA Progression)
- **File:** `src/app/dashboard/performance/page.tsx`
- **Bundle:** 3.53 kB | **225 kB First Load JS (BUDGET FAIL: +25 kB)**
- **Data Source:** Static semester arrays and grade tables.
- **Defects:** Heavy `recharts` import blows bundle budget. SGPA/CGPA trends are not derived from published examination results. No backlog indicator or policy version tracking.

### 3.4 `/dashboard/exams` (Internal Assessments & Exam Datesheet)
- **File:** `src/app/dashboard/exams/page.tsx`
- **Bundle:** 6.78 kB | 113 kB First Load JS
- **Data Source:** Static exam schedule and internal marks.
- **Defects:** Does not distinguish between unpublished draft marks and published results. Students can see unreviewed grades. No hall ticket download or eligibility gate check.

### 3.5 `/dashboard/leaves` (Student Leave Management)
- **File:** `src/app/dashboard/leaves/page.tsx`
- **Bundle:** 4.32 kB | 111 kB First Load JS
- **Data Source:** `mockData.leave_requests` via `src/lib/supabase.ts`.
- **Defects:** Form submission creates unverified client object directly into in-memory array. No file upload to Supabase Storage. No timeline stepper or clarification response workflow. No student withdrawal capability.

### 3.6 `/dashboard/doubts` (Academic Doubts & Mentorship)
- **File:** `src/app/dashboard/doubts/page.tsx`
- **Bundle:** 5.46 kB | 112 kB First Load JS
- **Data Source:** `mockData.doubts` and `mockData.doubt_messages`.
- **Defects:** No realtime chat subscriptions. Threaded conversations are static. Reopening resolved doubts lacks policy bounds.

### 3.7 `/dashboard/fees` (Student Fee Ledger & Receipts)
- **File:** `src/app/dashboard/fees/page.tsx`
- **Bundle:** 4.24 kB | 111 kB First Load JS
- **Data Source:** `mockData.payments` and `mockData.fees`.
- **Defects:** Payments ledger is flat. Balance is not computed via an append-only ledger calculation. Fake "Pay Now" button mocks UPI/Card transactions on the client without payment gateway integration or server webhook validation.

### 3.8 `/dashboard/notes` (Course Materials & Lecture Handouts)
- **File:** `src/app/dashboard/notes/page.tsx`
- **Bundle:** 500 B | 103 kB First Load JS
- **Data Source:** Static array in `src/lib/supabase.ts`.
- **Defects:** Tiny stub page. Download buttons trigger fake browser alerts rather than authenticated pre-signed URLs from Supabase Storage.

### 3.9 `/dashboard/announcements` (Notice Board)
- **File:** `src/app/dashboard/announcements/page.tsx`
- **Bundle:** 500 B | 103 kB First Load JS
- **Data Source:** Static mock announcements.
- **Defects:** Audience targeting is not evaluated. Read/unread tracking is not persisted to database.

### 3.10 `/dashboard/activities` (Campus Events & Extracurriculars)
- **File:** `src/app/dashboard/activities/page.tsx`
- **Bundle:** 499 B | 103 kB First Load JS
- **Data Source:** Static mock activities.
- **Defects:** Event registration does not check capacity, conflicts, or store registration records.

### 3.11 `/dashboard/camai` (AI Assistant Workspace)
- **File:** `src/app/dashboard/camai/page.tsx`
- **Bundle:** 10.3 kB | 156 kB First Load JS
- **Data Source:** Client-side regex match simulator.
- **Defects:** Simulates AI responses using hardcoded keyword triggers. (Note: Non-goal for production pilot; must be cleanly repurposed or hidden behind a feature flag).

### 3.12 `/dashboard/service-desk` (Document Requests & Grievances)
- **File:** `src/app/dashboard/service-desk/page.tsx`
- **Bundle:** 4 kB | 110 kB First Load JS
- **Data Source:** `mockData.service_requests`.
- **Defects:** Document generation is mocked. Requests cannot be tracked through multi-stage approval.

### 3.13 `/dashboard/settings` (Student Profile & Preferences)
- **File:** `src/app/dashboard/settings/page.tsx`
- **Bundle:** 3.18 kB | 109 kB First Load JS
- **Data Source:** Zustand store.
- **Defects:** Read-only inputs. Profile updates do not persist to Supabase `students` or `profiles` tables.

---

## 4. Faculty Module (`/faculty/*`)

**Parent Layout:** `src/app/faculty/layout.tsx`  
**Layout Characteristics:** Client-rendered layout (`'use client'`). Loads hardcoded faculty profile (`Dr. Priya Verma`) into Zustand store.

### 4.1 `/faculty` (Faculty Workspace Overview)
- **File:** `src/app/faculty/page.tsx`
- **Bundle:** 4.41 kB | 163 kB First Load JS
- **Defects:** Action tiles do not reflect real pending counts (hardcoded badge numbers). Deep links work, but data behind them is uncoordinated.

### 4.2 `/faculty/attendance` (Faculty Roll Call & Entry Screen)
- **File:** `src/app/faculty/attendance/page.tsx`
- **Bundle:** 5.63 kB | 125 kB First Load JS
- **Data Source:** TanStack Query calling `supabase.from('faculty_subjects')` and `attendance`.
- **Defects:**
  - `faculty_subjects` table does not exist in `mockData`, resulting in empty subject dropdown.
  - Missing keyboard roll-call (`P/A/L`, `Shift+A`, `Ctrl+Z`).
  - No session state machine (scheduled $\to$ open $\to$ submitted $\to$ locked).
  - No revision history or reason requirement for attendance corrections.
  - Submits via raw client `.upsert()` rather than atomic Postgres RPC.

### 4.3 `/faculty/exams` (Marks Entry & Grading Grid)
- **File:** `src/app/faculty/exams/page.tsx`
- **Bundle:** 8.17 kB | 167 kB First Load JS
- **Data Source:** `supabase.from('results')`.
- **Defects:**
  - Grade calculation occurs inside the React component using hardcoded thresholds instead of institution-configured policy rules.
  - No Excel/CSV paste parser or bulk error report.
  - No transition workflow (draft $\to$ submitted $\to$ reviewed $\to$ published). Faculty edits overwrite marks directly.
  - No diff view before submit.

### 4.4 `/faculty/classes` (Assigned Class Schedule)
- **File:** `src/app/faculty/classes/page.tsx`
- **Bundle:** 2.8 kB | 122 kB First Load JS
- **Defects:** Displays static class schedule cards. Not linked to teaching assignments table or semester calendar.

### 4.5 `/faculty/students` (Scoped Student Directory)
- **File:** `src/app/faculty/students/page.tsx`
- **Bundle:** 3.76 kB | 123 kB First Load JS
- **Defects:** Queries all students without enforcing faculty assignment scoping. Faculty can view students outside their department.

### 4.6 `/faculty/performance` (Student Risk Monitor)
- **File:** `src/app/faculty/performance/page.tsx`
- **Bundle:** 3 kB | **231 kB First Load JS (BUDGET FAIL: +31 kB)**
- **Defects:** Recharts direct import causes bundle size failure. Risk thresholds (<75% attendance) are hardcoded.

### 4.7 `/faculty/leaves` (Student Leave Approval Queue)
- **File:** `src/app/faculty/leaves/page.tsx`
- **Bundle:** 7.96 kB | 167 kB First Load JS
- **Defects:** Approver directly mutates `leave_requests.status` from browser. No routing checks to ensure faculty is the student's assigned proctor/advisor. No audit trail.

### 4.8 `/faculty/doubts` (Student Doubts Inbox)
- **File:** `src/app/faculty/doubts/page.tsx`
- **Bundle:** 6.05 kB | 125 kB First Load JS
- **Defects:** Query not filtered by faculty subject assignments. Split pane is missing; replies are unthreaded in database.

### 4.9 `/faculty/assignments` (Assignment Creation & Grading)
- **File:** `src/app/faculty/assignments/page.tsx`
- **Bundle:** 7.19 kB | 126 kB First Load JS
- **Defects:** Assignments are not saved to database. File submissions are not wired to Supabase Storage.

### 4.10 `/faculty/messages` (Faculty Communications Hub)
- **File:** `src/app/faculty/messages/page.tsx`
- **Bundle:** 6.77 kB | 126 kB First Load JS
- **Defects:** Direct chat mocked in localStorage.

### 4.11 `/faculty/announcements` (Notice Creation & Alerts)
- **File:** `src/app/faculty/announcements/page.tsx`
- **Bundle:** 7.91 kB | 167 kB First Load JS
- **Defects:** Audience targeting is not validated on server. Published notices do not fan out to recipient rows.

### 4.12 `/faculty/notes` (Course Handout Publishing)
- **File:** `src/app/faculty/notes/page.tsx`
- **Bundle:** 6.04 kB | 125 kB First Load JS
- **Defects:** File upload is mocked without backend validation of MIME types, magic bytes, or virus scanning.

### 4.13 `/faculty/groups` (Project & Cohort Groups)
- **File:** `src/app/faculty/groups/page.tsx`
- **Bundle:** 5.94 kB | 125 kB First Load JS
- **Defects:** Group creation does not enforce section or department boundaries.

### 4.14 `/faculty/camai` (Faculty AI Productivity Assistant)
- **File:** `src/app/faculty/camai/page.tsx`
- **Bundle:** 9.97 kB | 156 kB First Load JS
- **Defects:** Client-side mock chat simulator. Non-goal for production pilot.

### 4.15 `/faculty/settings` (Faculty Preferences)
- **File:** `src/app/faculty/settings/page.tsx`
- **Bundle:** 5.43 kB | 119 kB First Load JS
- **Defects:** Read-only mock display.

---

## 5. Admin Module (`/admin/*`)

**Parent Layout:** `src/app/admin/layout.tsx`  
**Layout Characteristics:** Client-rendered layout (`'use client'`). Loads hardcoded Admin profile into Zustand store.

### 5.1 `/admin` (Command Center Overview)
- **File:** `src/app/admin/page.tsx`
- **Bundle:** 7.47 kB | **281 kB First Load JS (BUDGET FAIL: +81 kB)**
- **Defects:** Severe bundle size overage caused by Recharts and Lucide. KPI cards (Enrollment, Active Faculty, Collections) display static mock numbers without date range filters or underlying aggregate views.

### 5.2 `/admin/students` (Student Registry & Lifecycle)
- **File:** `src/app/admin/students/page.tsx`
- **Bundle:** 10 kB | 169 kB First Load JS
- **Defects:** Table lacks virtualization and column density controls. Bulk import has no dry-run validation, duplicate checking, or error report.

### 5.3 `/admin/faculty` (Faculty Roster & Workload)
- **File:** `src/app/admin/faculty/page.tsx`
- **Bundle:** 9.13 kB | 168 kB First Load JS
- **Defects:** Faculty subject/class assignment mapping is disconnected from scheduling and attendance permissions.

### 5.4 `/admin/departments` (Department Directory & Heads)
- **File:** `src/app/admin/departments/page.tsx`
- **Bundle:** 6.46 kB | 168 kB First Load JS
- **Defects:** Cannot delete or archive departments with foreign key safety checks.

### 5.5 `/admin/courses` (Programmes, Curricula & Batches)
- **File:** `src/app/admin/courses/page.tsx`
- **Bundle:** 7.4 kB | 166 kB First Load JS
- **Defects:** Missing section and batch management. Course code uniqueness is not enforced across institutions.

### 5.6 `/admin/attendance` (Institution Attendance Monitor)
- **File:** `src/app/admin/attendance/page.tsx`
- **Bundle:** 6.33 kB | **235 kB First Load JS (BUDGET FAIL: +35 kB)**
- **Defects:** Recharts bundle failure. Cannot lock attendance sessions or view revision history.

### 5.7 `/admin/exams` (Examination & Results Management)
- **File:** `src/app/admin/exams/page.tsx`
- **Bundle:** 6.45 kB | 165 kB First Load JS
- **Defects:** Results publishing is not guarded by atomic RPC. No rollback or correction audit.

### 5.8 `/admin/fees` (Financial Operations & Fee Ledgers)
- **File:** `src/app/admin/fees/page.tsx`
- **Bundle:** 9.16 kB | 168 kB First Load JS
- **Defects:** Financial balances are calculated client-side. No double-entry ledger or payment reconciliation queue.

### 5.9 `/admin/approvals` (Unified Approvals Queue)
- **File:** `src/app/admin/approvals/page.tsx`
- **Bundle:** 5.68 kB | 167 kB First Load JS
- **Defects:** Updates `status` directly via client query without verifying approver delegation or writing audit events.

### 5.10 `/admin/communications` (Official Broadcasts & Alerts)
- **File:** `src/app/admin/communications/page.tsx`
- **Bundle:** 8.31 kB | 167 kB First Load JS
- **Defects:** Emergency alerts do not fan out to notification queues.

### 5.11 `/admin/documents` (Vault & Document Verification)
- **File:** `src/app/admin/documents/page.tsx`
- **Bundle:** 2.47 kB | 122 kB First Load JS
- **Defects:** Static file cards without Supabase Storage bucket integration.

### 5.12 `/admin/audit-logs` (System Audit Viewer)
- **File:** `src/app/admin/audit-logs/page.tsx`
- **Bundle:** 2.44 kB | 122 kB First Load JS
- **Defects:** Reads from mock array `audit_logs`. Does not record actor IP, request ID, before/after JSON diffs, or tamper-proof sequencing.

### 5.13 `/admin/security` (Role & Permission Console)
- **File:** `src/app/admin/security/page.tsx`
- **Bundle:** 2.64 kB | 113 kB First Load JS
- **Defects:** UI displays mock roles without connecting to Postgres RBAC or RLS policies.

### 5.14 `/admin/settings` (Institution Configuration)
- **File:** `src/app/admin/settings/page.tsx`
- **Bundle:** 5.34 kB | 191 kB First Load JS
- **Resolved:** Configures institutional policies including attendance thresholds, grading scales, and fine limits.

---

## 6. Authoritative Inventory Table & Production Sizes (All 47 Routes)

| # | Route | Portal / Module | Rendering | Final First Load JS | Budget (<= 200 kB) | Verification Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| 1 | `/` | Root Redirect | Static (○) | 103.0 kB | ✅ PASS | Verified |
| 2 | `/_not-found` | System 404 | Static (○) | 103.0 kB | ✅ PASS | Verified |
| 3 | `/login` | Auth | Client (○) | 151.0 kB | ✅ PASS | Verified |
| 4 | `/design-system` | Design System Gallery | Client (○) | 179.0 kB | ✅ PASS | Verified |
| 5 | `/dashboard` | Student Console | Client (○) | 187.0 kB | ✅ PASS | Verified |
| 6 | `/dashboard/activities` | Student Activities | Client (○) | 141.0 kB | ✅ PASS | Verified |
| 7 | `/dashboard/announcements`| Student Notices | Client (○) | 139.0 kB | ✅ PASS | Verified |
| 8 | `/dashboard/attendance` | Student Attendance | Client (○) | 185.0 kB | ✅ PASS | Verified |
| 9 | `/dashboard/camai` | Student AI Assist | Client (○) | 160.0 kB | ✅ PASS | Verified |
| 10 | `/dashboard/doubts` | Student Doubts | Client (○) | 189.0 kB | ✅ PASS | Verified |
| 11 | `/dashboard/exams` | Student Exams | Client (○) | 140.0 kB | ✅ PASS | Verified |
| 12 | `/dashboard/fees` | Student Fee Ledger | Client (○) | 187.0 kB | ✅ PASS | Verified |
| 13 | `/dashboard/leaves` | Student Leaves | Client (○) | 190.0 kB | ✅ PASS | Verified |
| 14 | `/dashboard/notes` | Student Notes | Client (○) | 186.0 kB | ✅ PASS | Verified |
| 15 | `/dashboard/performance` | Student CGPA/SGPA | Client (○) | 140.0 kB | ✅ PASS | Verified |
| 16 | `/dashboard/service-desk` | Student Support | Client (○) | 110.0 kB | ✅ PASS | Verified |
| 17 | `/dashboard/settings` | Student Settings | Client (○) | 110.0 kB | ✅ PASS | Verified |
| 18 | `/faculty` | Faculty Console | Client (○) | 141.0 kB | ✅ PASS | Verified |
| 19 | `/faculty/announcements` | Faculty Notices | Client (○) | 185.0 kB | ✅ PASS | Verified |
| 20 | `/faculty/assignments` | Faculty Assignments | Client (○) | 190.0 kB | ✅ PASS | Verified |
| 21 | `/faculty/attendance` | Faculty Roll-Call | Client (○) | 193.0 kB | ✅ PASS | Verified |
| 22 | `/faculty/camai` | Faculty AI Assist | Client (○) | 160.0 kB | ✅ PASS | Verified |
| 23 | `/faculty/classes` | Faculty Schedule | Client (○) | 109.0 kB | ✅ PASS | Verified |
| 24 | `/faculty/doubts` | Faculty Doubt Desk | Client (○) | 143.0 kB | ✅ PASS | Verified |
| 25 | `/faculty/exams` | Faculty Marks Entry | Client (○) | 191.0 kB | ✅ PASS | Verified |
| 26 | `/faculty/groups` | Faculty Batches | Client (○) | 188.0 kB | ✅ PASS | Verified |
| 27 | `/faculty/leaves` | Faculty Leave Desk | Client (○) | 143.0 kB | ✅ PASS | Verified |
| 28 | `/faculty/messages` | Faculty Inbox | Client (○) | 110.0 kB | ✅ PASS | Verified |
| 29 | `/faculty/notes` | Faculty Vault | Client (○) | 188.0 kB | ✅ PASS | Verified |
| 30 | `/faculty/performance` | Faculty Analytics | Client (○) | 124.0 kB | ✅ PASS | Verified |
| 31 | `/faculty/settings` | Faculty Settings | Client (○) | 119.0 kB | ✅ PASS | Verified |
| 32 | `/faculty/students` | Faculty Mentorship | Client (○) | 141.0 kB | ✅ PASS | Verified |
| 33 | `/admin` | Admin Console | Client (○) | 191.0 kB | ✅ PASS | Verified |
| 34 | `/admin/approvals` | Admin Approvals | Client (○) | 192.0 kB | ✅ PASS | Verified |
| 35 | `/admin/attendance` | Admin Attendance | Client (○) | 128.0 kB | ✅ PASS | Verified |
| 36 | `/admin/audit-logs` | Admin Audit Logs | Client (○) | 188.0 kB | ✅ PASS | Verified |
| 37 | `/admin/communications` | Admin Broadcasts | Client (○) | 190.0 kB | ✅ PASS | Verified |
| 38 | `/admin/courses` | Admin Curricula | Client (○) | 190.0 kB | ✅ PASS | Verified |
| 39 | `/admin/departments` | Admin Departments | Client (○) | 193.0 kB | ✅ PASS | Verified |
| 40 | `/admin/documents` | Admin Document Desk| Client (○) | 123.0 kB | ✅ PASS | Verified |
| 41 | `/admin/exams` | Admin Exam Center | Client (○) | 192.0 kB | ✅ PASS | Verified |
| 42 | `/admin/faculty` | Admin Faculty Registry| Client (○) | 193.0 kB | ✅ PASS | Verified |
| 43 | `/admin/fees` | Admin Financial Hub | Client (○) | 192.0 kB | ✅ PASS | Verified |
| 44 | `/admin/security` | Admin Security Desk | Client (○) | 190.0 kB | ✅ PASS | Verified |
| 45 | `/admin/settings` | Admin Settings | Client (○) | 191.0 kB | ✅ PASS | Verified |
| 46 | `/admin/students` | Admin Student Registry| Client (○) | 194.0 kB | ✅ PASS | Verified |
| 47 | `Middleware` | Edge Auth Guard | Edge Runtime (ƒ)| 95.0 kB | ✅ PASS | Verified |

