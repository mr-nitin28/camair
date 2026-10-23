# camair — CampusOS

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5.19-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.1.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_15+-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tests Passing](https://img.shields.io/badge/Tests-286%20Passed-success?style=for-the-badge)](tests/)
[![Bundle Budget](https://img.shields.io/badge/Bundle_Budget-100%25%20Passing%20(%E2%89%A4200kB)-success?style=for-the-badge)](scripts/check-bundle-budget.mjs)
[![WCAG 2.2 AA](https://img.shields.io/badge/Accessibility-WCAG_2.2_AA-green?style=for-the-badge)](docs/DESIGN_SYSTEM.md)

**camair (CampusOS)** is a modern, light-speed, accessible, multi-tenant campus operating platform engineered for universities, colleges, and academic institutions. It provides three unified persona modules—**Student**, **Faculty**, and **Administrator**—built upon a single canonical PostgreSQL data model, strict Row Level Security (RLS), transactional state machines, and an instant-feel SaaS interface.

---

## 🏛️ System Architecture

```
                       +-----------------------------------+
                       |         Next.js 15 Client         |
                       |    AppShell & Role-Aware Nav      |
                       +-----------------+-----------------+
                                         |
                       +-----------------v-----------------+
                       |         Edge Middleware           |
                       |     (src/middleware.ts - 95kB)    |
                       |   Session & RBAC Route Guard      |
                       +-----------------+-----------------+
                                         |
     +-----------------------------------+-----------------------------------+
     |                                   |                                   |
+----v--------------------+     +--------v---------------+     +-------------v-------------+
|     Student Portal      |     |   Faculty Workspace    |     |   Admin Command Center    |
|   (/dashboard/*)        |     |     (/faculty/*)       |     |        (/admin/*)         |
| Mobile-First Self-Serv. |     | Roll-Call Speed Screen |     |  Structure, People, Fees  |
+----+--------------------+     +--------+---------------+     +-------------+-------------+
     |                                   |                                   |
     +-----------------------------------+-----------------------------------+
                                         |
                       +-----------------v-----------------+
                       |     Domain Service Layer          |
                       | (Student, Faculty, Admin, Sync)   |
                       +-----------------+-----------------+
                                         |
                       +-----------------v-----------------+
                       |     PostgreSQL 15+ (Supabase)     |
                       |   30 Tables, RLS Deny-by-Default  |
                       |  Security Helpers (private schema)|
                       |   Transactional RPC State Machines|
                       |   Append-Only Ledgers & Outbox    |
                       +-----------------------------------+
```

---

## 🌟 Core Persona Modules

### 1. 🎓 Student Self-Service Portal (`/dashboard/*`)
- **Dashboard Overview**: "Today" strip with next class timing, active fee due counter, recent notices, and quick-action shortcuts.
- **Authoritative Attendance Ring**: Real-time SVG circular meter with the institutional 75% threshold marker, deficit recovery calculator ("3 consecutive classes to recover"), and per-subject status chips.
- **Published Examination Results**: Clear separation between published letter grades (with SGPA/CGPA trend sparklines) and enrolled courses currently under evaluation.
- **Learning Resources Vault**: Course, semester, and subject multi-filtering, preview metadata, bookmarking, and authorized downloads.
- **Leave Request Management**: Form with Zod boundary validation, visual stepper timeline, reviewer decision notes, and student withdrawal action.
- **Threaded Doubts Desk**: Structured discussion threads with course faculty, status tracking, and policy-enforced 2-reopen limit cap.
- **Strictly Read-Only Fee Ledger**: Itemized semester fee schedule, verified payment transaction receipts, and scholarship deductions in minor currency units (paise).

### 2. 👨‍🏫 Faculty Productivity Workspace (`/faculty/*`)
- **Flagship Attendance Roll-Call Speed Screen**:
  - **Keyboard-First Roll Call**: Single-key shortcuts `P` (Present), `A` (Absent), `L` (Late), `↑`/`↓` or `J`/`K` (row navigation), `Shift+A` (mark remaining present), and `Ctrl/Cmd+Z` (instant undo).
  - **Browser Shortcut Protection**: Key bindings strictly check modifier state (`!ctrlKey && !metaKey && !altKey`), preventing browser command collisions (e.g. `Ctrl+P` or `Ctrl+A`).
  - **Touch Mode with Tap-or-Toggle**: Generous touch targets for tablets/phones; tapping an active status toggles back to unmarked.
  - **Pre-Submit Summary Sheet & Actionable Undo Toast**: Modal summary before submission; actionable 8-second grace window toast to revert accidental submissions.
  - **Zero-Latency Roster Navigation**: Auto-scroll tracking for rosters of 150+ students without animation queue lag.
- **Spreadsheet Marks Entry**: Inline grade validation ($0 \le \text{marks} \le \text{max}$), RFC 4180 Excel/CSV paste parser, pre-submit diff viewer, and 4-stage pipeline stepper (`Draft` $\to$ `Submitted` $\to$ `Reviewed` $\to$ `Published`).
- **Scoped Student Directory**: Scoped strictly to the faculty member's assigned departments and sections, with attendance risk flags ($<75\%$) and batch selectors.
- **Split-Pane Approvals & Doubts**: Master-detail review queue for student leaves (with mandatory decision comments) and doubts resolution.

### 3. ⚙️ Administrator Command Center (`/admin/*`)
- **Executive Command Center**: 6 institutional KPIs with sparklines and period-over-period delta tracking (Enrolment, Faculty, Attendance, Results, Fee Collection, Pending Approvals).
- **Institution Structure & History Safety**: Departments, courses, academic sessions, and semesters. Destructive operations that would invalidate historical records are strictly blocked.
- **People Management & RFC 4180 Bulk Import**:
  - Full dry-run CSV verification detecting duplicate IDs/emails and foreign key errors before commit.
  - Profile editing with unique email collision checks.
  - Soft deactivation and reactivation retaining complete audit history.
- **Finance Command Center**: Double-entry fee structures, offline payment recording (Cash, Challan, DD, NetBanking, UPI), and collection analytics.
- **Examinations Governance**: Versioned grading scales with percentage cutoffs, assessment review queues, and immutable publication.
- **Unified Approvals & Security Governance**: Role & permission editor with visual diff confirmation before saving, and a searchable JSON audit log viewer.

---

## 🚀 Performance & Bundle Budget SLA

Every route was audited and optimized to meet strict Section 11 targets on mid-tier mobile profiles:

| Route Group | First Load JS (gzipped) | Target Budget | Compliance | Optimization Applied |
| :--- | :--- | :--- | :--- | :--- |
| **Shared Shell JS** | **102 kB** | $\le 120\text{ kB}$ | ✅ **PASS** | Shared vendor and layout chunks |
| **Student Routes** | **163 kB – 196 kB** | $\le 200\text{ kB}$ | ✅ **PASS** | Dynamic code-split charts & `LazyMotion` |
| **Faculty Routes** | **162 kB – 198 kB** | $\le 200\text{ kB}$ | ✅ **PASS** | Auto-scrolling, code-split data grids |
| **Admin Routes** | **172 kB – 199 kB** | $\le 200\text{ kB}$ | ✅ **PASS** | Dynamic imports for Recharts & audit diffs |

### Database Query Benchmarks (Measured via PGlite / Postgres):
- **Single-row primary key reads**: $p95 = \mathbf{1.24\text{ ms}}$ (target $\le 10\text{ ms}$)
- **Multi-tenant list queries**: $p95 = \mathbf{2.87\text{ ms}}$ (target $\le 50\text{ ms}$)
- **Dashboard aggregate queries**: $p95 = \mathbf{6.14\text{ ms}}$ (target $\le 150\text{ ms}$)
- **Peak attendance submission burst**: 50 concurrent submissions completed with 0 deadlocks under `FOR UPDATE` row locking.

---

## 🔒 Security, RLS & Payment Integrity

1. **Row Level Security (RLS)**:
   - Enabled on **100% of the 30 relational database tables** (`relrowsecurity = true`).
   - Tenant isolation guaranteed via `institution_id` on all institutional rows.
   - Private schema helper functions (`current_institution_id()`, `has_permission()`, `is_assigned_faculty()`, `is_self_student()`) run with `SET search_path = ''`.
   - Identity evaluations wrap `(SELECT auth.uid())` inside policies to evaluate once per statement instead of per row.
2. **Cryptographic Payment Webhooks**:
   - Webhook signatures verified using HMAC SHA-256 with timing-safe comparison (`crypto.timingSafeEqual`).
   - 300-second timestamp drift tolerance to prevent replay attacks.
3. **Disaster Recovery**:
   - Snapshot export and restore verified with **100% byte-for-byte SHA-256 checksum equality** across all 30 non-empty tables and **0 orphaned foreign key references**.

---

## ♿ Design & Motion System (WCAG 2.2 AA)

- **Color Contrast**: Body text achieves $\ge 4.5:1$ (measured $18.5:1$ light, $17.1:1$ dark); UI boundaries achieve $\ge 3:1$.
- **Touch Targets**: Mobile navigation items declare minimum touch dimensions of $\ge 44 \times 44\text{ px}$.
- **Focus Management**: Modals, drawers, and the `Ctrl+K` command palette implement WAI-ARIA `role="dialog"`, `aria-modal="true"`, focus trapping (`Tab`/`Shift+Tab`), and focus restoration.
- **Motion Safety**: Powered by `LazyMotion` and `framer-motion`, strictly animating `transform` and `opacity`. Automatically collapses all animations to $\le 0.01\text{s}$ under `prefers-reduced-motion`.

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js**: v20.0.0 or higher
- **Package Manager**: `npm` v10+
- **Git**

### 2. Installation
```bash
# Clone the repository
git clone git@github.com:mr-nitin28/camair.git
cd camair

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SECRET_KEY=your-supabase-secret-key

NODE_ENV=development
```

### 4. Database Migrations
Migrations are version-controlled under `supabase/migrations/`:
1. `20261023000001_core_schema.sql`: Core 30 tables, foreign keys, and constraints.
2. `20261023000002_rls_and_helpers.sql`: Private helper functions and RLS policies.
3. `20261023000003_rpc_state_machines.sql`: Transactional RPCs (`FOR UPDATE` locking, audit trail, calculations).
4. `20261023000004_seed_data.sql`: Deterministic 2-institution seed fixtures covering all 8 roles.

Apply migrations to your Supabase PostgreSQL instance using the Supabase CLI:
```bash
npx supabase db push
```

### 5. Running the Application
```bash
# Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

---

## 🧪 Verification & Quality Commands

```bash
# Run the complete test suite (286 tests across 10 suites)
npm test

# Run TypeScript typecheck (0 errors)
npx tsc --noEmit

# Run ESLint validation (0 errors)
npm run lint

# Verify bundle budgets across all 46 routes (<= 200 kB gzipped)
npm run budget:check

# Create optimized production build
npm run build
```

---

## 📚 Architectural Documentation Sitemap

Comprehensive documentation is maintained in the [`docs/`](docs/) directory:

| Document | Purpose |
| :--- | :--- |
| [`docs/PROJECT_AUDIT.md`](docs/PROJECT_AUDIT.md) | Initial codebase audit, baselines, and technical gap matrix. |
| [`docs/PRODUCT_REQUIREMENTS.md`](docs/PRODUCT_REQUIREMENTS.md) | Detailed functional requirements for Student, Faculty, and Admin modules. |
| [`docs/ROUTE_INVENTORY.md`](docs/ROUTE_INVENTORY.md) | Exhaustive inventory of all 47 build endpoints with bundle sizes and states. |
| [`docs/DATABASE_AND_DATA_FLOW.md`](docs/DATABASE_AND_DATA_FLOW.md) | Complete 30-table relational schema, entity relationships, and RPC signatures. |
| [`docs/RBAC_MATRIX.md`](docs/RBAC_MATRIX.md) | Role $\times$ Resource $\times$ Action $\times$ Scope authorization matrix. |
| [`docs/WORKFLOW_SPECIFICATION.md`](docs/WORKFLOW_SPECIFICATION.md) | Formal state machines for attendance, leaves, grading, fees, and doubts. |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | CSS design tokens, light/dark themes, role accents, and component specs. |
| [`docs/MOTION_SYSTEM.md`](docs/MOTION_SYSTEM.md) | Motion duration tokens, easing functions, and reduced-motion standards. |
| [`docs/PERFORMANCE_BUDGETS.md`](docs/PERFORMANCE_BUDGETS.md) | Target SLAs vs measured history across all routes and database queries. |
| [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) | Comprehensive test plan covering unit, security, integration, and load suites. |
| [`docs/SECURITY_REVIEW.md`](docs/SECURITY_REVIEW.md) | Threat modeling, RLS policies, DPDP/GDPR context, and webhook verification. |
| [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) | Registry of institutional, architectural, and financial assumptions (`A-001`–`A-015`). |
| [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md) | Phased execution roadmap tracking Phases 0 through 7. |
| [`docs/FEATURE_STATUS.md`](docs/FEATURE_STATUS.md) | Real codebase verification matrix classifying feature readiness. |
| [`docs/RELEASE_READINESS.md`](docs/RELEASE_READINESS.md) | Production pilot readiness assessment, deployment runbook, and sign-off. |

---

## 👥 Persona Login Test Credentials

The deterministic seed fixture creates accounts across both test institutions:

| Role | Email | Institution | Workspace Path |
| :--- | :--- | :--- | :--- |
| **Student** | `student@campusos.dev` | Apex Institute of Technology | `/dashboard` |
| **Faculty** | `faculty@campusos.dev` | Apex Institute of Technology | `/faculty` |
| **Super Admin** | `superadmin@campusos.dev` | Global / Multi-Tenant | `/admin` |
| **Institution Admin** | `admin@campusos.dev` | Apex Institute of Technology | `/admin` |
| **Examination Admin** | `exam.admin@campusos.dev` | Apex Institute of Technology | `/admin/exams` |
| **Finance Admin** | `finance.admin@campusos.dev` | Apex Institute of Technology | `/admin/fees` |

---

## 📄 License
This project is proprietary software developed for university and institutional deployments. All rights reserved.
