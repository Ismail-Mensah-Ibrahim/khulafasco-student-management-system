# Khulafasco Student Management System

Student Enrollment & Fee Management System for **Alkhulafau Arrashiduun Islamic Senior High School (Khulafasco)**.

---

## Purpose

A production-ready web application for school administration and finance operations, covering:

- Student enrollment and record management
- Student photographs (Supabase Storage)
- Fee charges and configuration
- Payment recording and manual allocation
- Receipts and payment history
- Staff access control (Admin / Finance Officer)
- Audit logging

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (`student-photos` bucket) |
| Deployment | Vercel |

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/Ismail-Mensah-Ibrahim/khulafasco-student-management-system.git
cd khulafasco-student-management-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Start the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

See [`.env.example`](.env.example) for the full list.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon (public) key |

> ⚠️ Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code.

---

## Build Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## Supabase Setup

The database has already been created. Key tables:

- `academic_years`, `programs`, `houses`
- `profiles` (staff accounts)
- `students` (identified by `jhs_index_number` — JHS/BECE Index Number)
- `fee_types`, `fee_configurations`, `student_charges`
- `payments`, `payment_allocations`
- `audit_logs`

Key RPC functions used by the application:

- `get_my_role()` — returns the current user's role
- `is_admin()`, `is_finance_officer()`
- `enroll_student()` — safe student enrollment
- `set_student_amount_due()` — set total amount due
- `set_student_fee_charge()` — configure fee charges
- `record_student_payment()` — record a payment with allocations
- `get_student_finance_by_index()` — finance lookup by index number
- `get_student_financial_reconciliation()` — balance reconciliation

Row Level Security (RLS) is enabled on all tables.

---

## User Roles & Responsibilities

The system implements a comprehensive 8-role Role-Based Access Control (RBAC) architecture:

| Role | Responsibilities & Access Scope | Dedicated Landing Route |
|---|---|---|
| `admin` | Full administrative access: student admission, academic years, semesters, classes, houses, programs, fee configuration, staff lifecycle & RBAC, system-wide audit logs. | `/dashboard` |
| `it_officer` | Technical operations, system uptime monitoring, ticket triage, security & audit center, and secure dispatch of user password resets. | `/it/dashboard` |
| `headmaster` | Executive governance: institutional analytics, student directory inspection, financial audit overview, requisition review/approvals, audit history. | `/headmaster/dashboard` |
| `academic_head` | Curriculum coordination: class stream allocations, semester scheduling, subject offerings, assessment & terminal results moderation, student directory access. | `/academic/dashboard` |
| `teacher` | Classroom operations: daily attendance marking, subject test (30%) & exam (70%) grade submissions, requisition requests, IT helpdesk. | `/teacher/dashboard` |
| `finance_officer` | Financial administration: student fee assignment, payment intake, manual fee allocation, receipt generation, reconciliation, requisition disbursements. | `/finance` |
| `domestic_officer` | School operations & logistics: boarding facilities, supply requisitions, logistics tracking, IT helpdesk. | `/operations/dashboard` |
| `general_staff` | Workplace requests: material and expenditure requisitions, IT helpdesk support. | `/staff/dashboard` |

Roles are enforced at every application layer: database RLS, server actions, and Server Component DAL guards.

---

## Core Lifecycle & Operational Features

### 1. Staff Lifecycle Management (`/admin/staff`)
- **8-Role RBAC Administration**: Authoritative role assignment and live profile editing.
- **Account Activation / Deactivation**: Non-destructive toggle to disable staff access immediately.
- **Pre-Deletion Reference Safety Audit**: Automated RPC check verifying 8 reference tables (`audit_logs`, `payments`, `requests`, `attendance_records`, `student_results`, `it_tickets`, `classes`, `teacher_assignments`) before allowing permanent deletion.
- **Secure Password Reset Dispatch**: Authorized dispatch of Supabase Auth password recovery emails.

### 2. Academic Lifecycle: Semesters & Classes (`/admin/semesters`, `/admin/classes`)
- **Configurable Semesters**: Manage Semester 1 & Semester 2 per academic year with unique active semester enforcement.
- **Classes & Streams**: Stream creation (e.g., 1A, 1B, 2 Science, etc.) tied to academic years and programs with capacity limits.
- **Class Teacher Assignments**: Assignment of teaching staff to manage specific classes.
- **Student Academic Enrollments**: Comprehensive historical tracking (`student_academic_enrollments`) recording student progression across years and semesters without overwriting past enrollment records.

### 3. Bulk Student Import Wizard (`/students/import`)
- **7-Step Import Wizard**: Download Template $\rightarrow$ Upload CSV $\rightarrow$ Validation & Duplicate Detection $\rightarrow$ Record Preview $\rightarrow$ Mode Selection (`new_only` / `update_existing`) $\rightarrow$ Transactional Execution $\rightarrow$ Summary Report.
- **Duplicate Prevention**: In-file duplicate index checking and database index conflict resolution.
- **Data Integrity**: Automatically attaches students to the active academic year, semester, program, and house.

### 4. Student Promotion & Academic Progression (`/students/promotion`)
- **Cohort Promotion**: Promote students across academic years (Form 1 $\rightarrow$ Form 2 $\rightarrow$ Form 3 $\rightarrow$ Graduated).
- **Flexible Outcomes**: Support for `PROMOTED`, `REPEATED`, `GRADUATED`, `TRANSFERRED`, `WITHDRAWN`, and `DEFERRED`.
- **Destination Stream Assignment**: Target class assignment with capacity awareness.
- **Batch Progression Audit**: Audit trail records generated for each cohort transition.

### 5. Security & Audit Center (`/it/audit`, `/admin/audit-logs`)
- **Chronological Audit Trail**: Searchable event logs with date range, user, actor role, module, action, target, and status filters.
- **Severity Classification**: `INFO`, `WARNING`, `SECURITY`, and `CRITICAL` severity flags.
- **Event Detail & Payloads**: Full modal inspection displaying actor details, target identifiers, and before/after state snapshots.
- **Operational Metrics**: IT dashboard stream tracking active/disabled staff, open tickets, and security events.

---

## Out-of-Scope Modules & Boundaries

To preserve strict compliance with school requirements and avoid bloat, the following modules are explicitly designated as out-of-scope:

- **Library Management**: Book cataloging, borrowing/lending cards, and barcode scanning are NOT implemented.
- **Clinical SickBay Records**: Full electronic health records (EHR), prescription management, and detailed medical history are NOT implemented (basic boarding health notes are maintained within student profile records).

---

## Student Identification

The official canonical student identifier is the **JHS/BECE Index Number**.

- Required, unique, searchable
- Always normalized: 10 digits, trimmed
- Finance and enrollment search and reconcile strictly by this number
- Enforced by unique database constraints and application validation

---

## Architecture

```
src/
├── app/
│   ├── (auth)/          # Staff authentication & login
│   ├── (dashboard)/     # Role-guarded operational routes
│   │   ├── academic/    # Academic Head & Teacher workflows
│   │   ├── admin/       # Administrator configuration & staff access
│   │   ├── dashboard/   # Smart root dashboard router
│   │   ├── finance/     # Fee configuration, payments & receipts
│   │   ├── headmaster/  # Executive oversight dashboard
│   │   ├── it/          # IT Support, health checks & ticketing
│   │   ├── operations/  # Domestic & logistics workspace
│   │   ├── requests/    # Multi-tier requisition workflows
│   │   ├── staff/       # General staff portal
│   │   └── students/    # Student enrollment, directory & details
│   └── unauthorized/    # Access denied fallback
├── components/
│   ├── branding/        # Official Khulafasco crest and headers
│   ├── layout/          # TopBar, role-aware Sidebar, MobileSidebar
│   ├── shared/          # DataTable, PageHeader, EmptyState, StatCard
│   └── ui/              # Accessible UI components (Tailwind v4 / Radix)
├── config/
│   ├── branding.ts      # School identity, colors, mottos
│   └── constants.ts     # Roles, statuses, payment methods, classes
├── lib/
│   ├── actions/         # Authoritative Server Actions (auth, admin, finance, academics, IT, requests)
│   ├── dal.ts           # Data Access Layer & session/role guards
│   ├── data.ts          # Server-side data retrieval functions
│   ├── supabase/        # Browser and Server clients
│   └── validation/      # Zod validation schemas
└── types/
    └── index.ts         # TypeScript models mirroring schema
```

---

## Deployment (Vercel)

1. Connect the GitHub repository to Vercel.
2. Set environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy from the verified release branch.
