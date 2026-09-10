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

## User Roles

| Role | Permissions |
|---|---|
| `admin` | Full access: enrollment, records, financial setup, staff management, audit logs |
| `finance_officer` | Finance operations: view students, set amounts, record payments, generate receipts |

Roles are enforced at the database level via RLS and RPC functions.

---

## Student Identification

The official student identifier is the **JHS/BECE Index Number**.

- Required, unique, searchable
- Always normalized: uppercase, trimmed
- Finance searches by this number
- Do NOT use any other generated ID

---

## Architecture

```
src/
├── app/
│   ├── (auth)/          # Login, unauthenticated pages
│   └── (dashboard)/     # Protected application routes
├── components/
│   ├── branding/        # SchoolLogo, SchoolHeader
│   ├── layout/          # Sidebar, TopBar, MobileSidebar, AppShell
│   ├── shared/          # StatCard, PageHeader, DataTable, EmptyState, etc.
│   └── ui/              # shadcn primitives
├── config/
│   ├── branding.ts      # School name, logo, colors
│   └── constants.ts     # Programs, houses, roles, payment methods
├── features/            # Feature modules (Milestones 3–8)
├── lib/
│   ├── supabase/        # Browser and server clients
│   └── utils.ts         # cn(), formatCurrency(), getFullName(), etc.
├── hooks/               # React hooks (Milestone 2+)
└── types/
    └── index.ts         # TypeScript types mirroring the DB schema
```

---

## Deployment (Vercel)

1. Connect the GitHub repository to Vercel.
2. Set environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy from the `main` branch.

Do not deploy to production automatically — obtain approval first.

---

## Development Milestones

| Milestone | Status | Description |
|---|---|---|
| 1 | ✅ Complete | Project foundation, design system, school branding |
| 2 | ⏳ Pending approval | Supabase auth, session management, protected routes |
| 3 | ⏳ Pending | Admin dashboard, student enrollment |
| 4 | ⏳ Pending | Student records, search, profile |
| 5 | ⏳ Pending | Finance dashboard, financial setup |
| 6 | ⏳ Pending | Fee charges, reconciliation |
| 7 | ⏳ Pending | Payment recording, manual allocation |
| 8 | ⏳ Pending | Receipts, payment history |
| 9 | ⏳ Pending | Audit/activity, security hardening |
| 10 | ⏳ Pending | Responsive QA, accessibility, polish |
| 11 | ⏳ Pending | Production build, Vercel readiness |
