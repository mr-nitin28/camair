# CampusOS — Comprehensive Feature Status Matrix

**Phase:** Phase 0 Discovery & Baseline  
**Classification Standard:** Real Codebase Verification  
**Categories:**
- `Implemented and verified`: Real backend + frontend code, tested and confirmed working.
- `Implemented but unverified`: Complete UI and mock/client code, but lacking automated backend tests or verification against live database.
- `Partially implemented`: UI exists, but key business logic, persistence, or validation is stubbed or missing.
- `Missing`: Required by Master Prompt specification, but absent from the repository.
- `Broken`: Code exists, but fails to execute, throws errors, or returns invalid data due to missing structures.
- `Blocked by external configuration`: Depends on external services (e.g. payment gateway, email SMTP, SMS gateway) that are not configured.

---

## 1. Student Module (`/dashboard/*`)

| Feature | Route / Component | Status | Codebase Evidence & Root Cause |
| :--- | :--- | :--- | :--- |
| **Authentication & Role Guard** | `src/app/login/page.tsx` | `Partially implemented` | Client-only check using `localStorage.getItem('mock_user_role')`. No Supabase Auth cookie or server middleware protection. |
| **Dashboard Home Shell** | `src/app/dashboard/page.tsx` | `Partially implemented` | UI layout renders, but KPI stats (88.5% attendance, fees) are hardcoded literals instead of database calculations. |
| **Attendance Ring & Details** | `src/app/dashboard/attendance/page.tsx` | `Partially implemented` | Renders chart, but uses in-file `mockAttendanceLog` and hardcoded formulas. Exceeds JS bundle budget (217 kB). |
| **Performance Progression** | `src/app/dashboard/performance/page.tsx` | `Partially implemented` | Hardcoded SGPA/CGPA cards. Exceeds JS bundle budget (225 kB). No link to examination published marks. |
| **Internal Assessment Results**| `src/app/dashboard/exams/page.tsx` | `Partially implemented` | Renders assessment table, but does not distinguish draft marks from published grades. |
| **Leave Request Form & History**| `src/app/dashboard/leaves/page.tsx` | `Partially implemented` | Basic form writes to in-memory array. No Supabase Storage upload, no clarification flow, no withdraw action. |
| **Doubt Creation & Messaging** | `src/app/dashboard/doubts/page.tsx` | `Partially implemented` | Chat thread displays mock messages. No Realtime WebSocket subscriptions or policy reopen limits. |
| **Fee Ledger & Balance** | `src/app/dashboard/fees/page.tsx` | `Partially implemented` | Displays static fee list. "Pay Now" simulates payment in client without gateway or idempotent webhook verification. |
| **Notes & Handout Download** | `src/app/dashboard/notes/page.tsx` | `Partially implemented` | Displays list of 5 PDF titles. Download button triggers alert popup; no Supabase Storage pre-signed URLs. |
| **Notice Board & Alerts** | `src/app/dashboard/announcements/page.tsx` | `Partially implemented` | Displays static notices. No audience targeting evaluation or persistent read/unread flags. |
| **Campus Activities** | `src/app/dashboard/activities/page.tsx` | `Partially implemented` | Static cards. Registration button updates client state only. |
| **Service Desk Requests** | `src/app/dashboard/service-desk/page.tsx`| `Partially implemented` | Mock document request list. No multi-stage approval tracking. |
| **Profile Settings** | `src/app/dashboard/settings/page.tsx` | `Partially implemented` | Static display of student profile. Form edits do not mutate database. |
| **CamAI Chat Simulator** | `src/app/dashboard/camai/page.tsx` | `Partially implemented` | Simulated keyword regex chat. (Declared non-goal for production pilot). |

---

## 2. Faculty Module (`/faculty/*`)

| Feature | Route / Component | Status | Codebase Evidence & Root Cause |
| :--- | :--- | :--- | :--- |
| **Faculty Console Overview** | `src/app/faculty/page.tsx` | `Partially implemented` | Tile metrics are static numbers. Not connected to faculty's active teaching schedule. |
| **Assigned Classes Schedule**| `src/app/faculty/classes/page.tsx` | `Partially implemented` | Renders hardcoded class schedule cards. Not linked to `teaching_assignments` table. |
| **Attendance Roster Entry** | `src/app/faculty/attendance/page.tsx` | `Broken` | Queries `faculty_subjects` table which does not exist in `mockData`, resulting in empty subject dropdown. Lacks keyboard roll-call (`P/A/L`), autosave, summary sheet, and revision history. |
| **Marks Entry & Grading Grid**| `src/app/faculty/exams/page.tsx` | `Broken` | Queries `faculty_subjects` (empty). Computes grades via client-side hardcoded thresholds. Lacks CSV paste, diff view, and state transitions (`draft` $\to$ `submitted`). |
| **Student Directory (Scoped)**| `src/app/faculty/students/page.tsx` | `Partially implemented` | Queries all students in mock table without enforcing faculty department/assignment boundaries. |
| **Risk Monitor** | `src/app/faculty/performance/page.tsx`| `Partially implemented` | Visualizes low attendance students. Exceeds JS bundle budget (231 kB). |
| **Leave Approval Queue** | `src/app/faculty/leaves/page.tsx` | `Partially implemented` | Approves leave by directly updating client array. No routing authorization check or audit event emission. |
| **Doubts Inbox & Split Pane** | `src/app/faculty/doubts/page.tsx` | `Partially implemented` | Queries all doubts globally. No faculty-subject filtering or split-pane view. |
| **Assignment Management** | `src/app/faculty/assignments/page.tsx` | `Partially implemented` | Form exists, but assignments are not persisted to database. |
| **Notice Creation & Alerts** | `src/app/faculty/announcements/page.tsx`| `Partially implemented` | Creates notices in memory. Audience targeting not enforced on server. |
| **Course Notes Upload** | `src/app/faculty/notes/page.tsx` | `Partially implemented` | File picker exists, but does not upload to Supabase Storage. |
| **Student Groups** | `src/app/faculty/groups/page.tsx` | `Partially implemented` | In-memory group creation without section boundaries. |
| **Communication Hub** | `src/app/faculty/messages/page.tsx` | `Partially implemented` | Direct messaging mocked in browser localStorage. |
| **Faculty Settings** | `src/app/faculty/settings/page.tsx` | `Partially implemented` | Static display of faculty details. |

---

## 3. Admin Module (`/admin/*`)

| Feature | Route / Component | Status | Codebase Evidence & Root Cause |
| :--- | :--- | :--- | :--- |
| **Command Center Overview** | `src/app/admin/page.tsx` | `Partially implemented` | Exceeds JS bundle budget (281 kB). KPI values are static constants; no aggregate queries or sparklines. |
| **Student Registry & Lifecycle**| `src/app/admin/students/page.tsx` | `Partially implemented` | Table exists, but lacks virtualization and column density toggles. Bulk import lacks dry-run validation and error reporting. |
| **Faculty Registry & Roles** | `src/app/admin/faculty/page.tsx` | `Partially implemented` | Basic list of faculty. Cannot assign teaching sections or map department leadership. |
| **Department Administration** | `src/app/admin/departments/page.tsx`| `Partially implemented` | CRUD operations in mock array. No foreign key constraints preventing deletion of active departments. |
| **Courses & Curricula** | `src/app/admin/courses/page.tsx` | `Partially implemented` | Missing section, semester, and batch mapping tools. |
| **Attendance Monitor & Locks** | `src/app/admin/attendance/page.tsx` | `Partially implemented` | Exceeds JS bundle budget (235 kB). Cannot lock sessions or view revision diffs. |
| **Examinations & Publication**| `src/app/admin/exams/page.tsx` | `Partially implemented` | Results publication is an unverified single field update without approval queues or immutability locks. |
| **Fee Operations & Billing** | `src/app/admin/fees/page.tsx` | `Partially implemented` | Fee structures cannot be assigned to cohorts. Lacks double-entry reconciliation ledger. |
| **Unified Approvals Queue** | `src/app/admin/approvals/page.tsx` | `Partially implemented` | Updates status directly via client query without role delegation checks. |
| **Official Broadcast Board** | `src/app/admin/communications/page.tsx`| `Partially implemented` | Notice creator without durable recipient fan-out rows. |
| **Documents Vault** | `src/app/admin/documents/page.tsx` | `Partially implemented` | Mock document cards without Supabase Storage bucket integration. |
| **System Audit Trail** | `src/app/admin/audit-logs/page.tsx` | `Partially implemented` | Displays static mock logs. Missing IP tracking, request IDs, and before/after diff viewer. |
| **Security & RBAC Console** | `src/app/admin/security/page.tsx` | `Partially implemented` | Static role checkboxes disconnected from PostgreSQL RLS policies. |
| **Institution Settings** | `src/app/admin/settings/page.tsx` | `Partially implemented` | Form inputs do not mutate remote database or update policy records. |

---

## 4. Cross-Cutting Infrastructure & Platform Features

| System Capability | Target Specification | Current Codebase Status | Status |
| :--- | :--- | :--- | :--- |
| **Remote Database Schema** | 27+ Relational tables with RLS | 0 tables in public schema (`definitions: []`) | `Broken` |
| **Database Migrations** | Version-controlled SQL in `supabase/` | Zero migration files found | `Missing` |
| **Supabase Client SDK** | `@supabase/supabase-js`, `@supabase/ssr` | Replaced by mock query builder in `src/lib/supabase.ts` | `Broken` |
| **Row Level Security (RLS)** | Deny by default on all tables | No RLS active | `Broken` |
| **Server Components & Actions**| Next.js App Router RSC | 100% client components (`'use client'`) | `Broken` |
| **Design System Tokens** | Master CSS variables, Inter font | Basic CSS in `src/app/globals.css`, no density toggles | `Partially implemented` |
| **Motion System** | Framer Motion with standard tokens | Raw animation props, no reduced-motion global guard | `Partially implemented` |
| **Automated Testing Suite** | Vitest, Playwright, fast-check | Zero tests configured or present | `Missing` |
| **Payment Gateway Integration**| Server-verified webhook signatures | Mock client click handler | `Blocked by external configuration` |
| **File Storage & Security** | Private buckets, short-lived URLs | No bucket configuration or signed URLs | `Missing` |
| **Audit Logging Engine** | Append-only DB triggers / RPCs | Static mock array | `Missing` |
| **Notification Outbox Pattern** | Transactional outbox with fan-out | In-memory Zustand store | `Missing` |
