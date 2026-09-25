# Khulafasco Student Management System — Architecture & System Discovery

## Executive Summary

Khulafasco Student Management System is an active, production-grade school administration and student management platform for **Al-Khulafau Ar-Rashiduun Islamic Senior High School**.
The system is currently operating in production with 58 enrolled students, 4 active student houses (Abubakar, Umar, Uthman, Ali), multiple active academic programs, teacher workloads, financial records, audit logs, and authenticated staff roles.

This document serves as the authoritative discovery audit and architectural roadmap for introducing a dedicated, modular **NestJS** backend alongside the existing Next.js frontend, ensuring zero data loss, continuous uptime, and incremental migration.

---

## 1. Current Architecture Topology

```
┌────────────────────────────────────────────────────────┐
│               Frontend (Next.js 16)                    │
│   App Router, React 19, Tailwind CSS v4, shadcn/ui     │
│   - DAL (Data Access Layer via React cache & cookies)  │
│   - Server Actions (direct mutation boundary)          │
│   - Route Handlers (student-photo upload/serve)        │
└──────────────────────────┬─────────────────────────────┘
                           │ (Direct client/action calls)
                           ▼
┌────────────────────────────────────────────────────────┐
│             Supabase Managed Services                  │
│   - PostgreSQL 15 (Tables, Views, Constraints, Triggers│
│   - GoTrue Auth (Session JWT, RBAC profile sync)       │
│   - Storage Buckets (student-photos, private documents)│
│   - Row Level Security (RLS) + SECURITY DEFINER RPCs   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Target Production Architecture

```
┌────────────────────────────────────────────────────────┐
│               Frontend (Next.js 16)                    │
│   App Router, React 19, Tailwind CSS v4, shadcn/ui     │
│   - Communicates via typed API Client (`/api/v1/...`)  │
│   - Server Actions adapt to NestJS endpoints           │
│   - Retains responsive UI, toasts, and print views     │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / REST (Bearer JWT)
                           ▼
┌────────────────────────────────────────────────────────┐
│           Dedicated Backend (NestJS 11)                │
│   Authoritative Application & Business Logic Layer     │
│   - OpenAPI / Swagger Documentation (`/api/docs`)      │
│   - Global Request Interceptor & Correlation IDs       │
│   - Centralized Exception Filter & Error Standard      │
│   - JWT AuthGuard + Dynamic RBAC RolesGuard            │
│   - Class-Validator DTOs & Transformation Pipes        │
│   - Domain Modules (Students, Staff, Timetable, etc.)  │
│   - Transaction-Safe Service Layer                     │
└──────────────────────────┬─────────────────────────────┘
                           │ Direct PG Pool / Supabase Admin
                           ▼
┌────────────────────────────────────────────────────────┐
│              Database & Storage Layer                  │
│   - Supabase PostgreSQL (58+ tables, views, RPCs)      │
│   - Supabase Auth (Identity & Token validation)        │
│   - Supabase Storage (Private & Public buckets)        │
│   - Production RLS Policies preserved                  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Comprehensive System Discovery Audit

### Categorization Grid (A through L)

| Category | Description | Discovered Features & Findings |
|---|---|---|
| **A** | **UI exists + backend exists + works** | 1. Student enrollment (`/students/enroll` -> `enroll_student` RPC)<br>2. Student list, search, filter, pagination (`/students`)<br>3. Student profile & update (`/students/[jhs_index_number]`)<br>4. Student photo upload & display (`/api/student-photo/*`)<br>5. House dashboard & Khalifa order (`/admin/houses`, `/house/dashboard`)<br>6. House Exeats issue & return (`/house/exeats`)<br>7. House deterministic gender rebalancing (`rebalance_houses_atomic`)<br>8. Academic Years CRUD & current year toggle (`/admin/academic-years`)<br>9. Programs & Fee types creation (`/admin/programs`, `/admin/fee-types`)<br>10. Semesters management (`/admin/semesters`)<br>11. Classes, streams, class teacher assignment (`/admin/classes`, `/academic/classes`)<br>12. Subjects management (`/academic/classes`)<br>13. Teacher subject & class assignments (`/academic/classes`)<br>14. Timetable entry creation & conflict checks (`/academic/timetable`)<br>15. Timetable publication & unpublication (`publish_timetable`, `unpublish_timetable`)<br>16. Teacher personal timetable view (`/teacher/timetable` -> `v_published_teacher_timetable`)<br>17. Attendance recording (`/teacher/attendance`)<br>18. Assessment result submission & review (`/teacher/results`)<br>19. Student promotion execution (`/students/promotion` -> `promote_student`)<br>20. Student transfers in/out & academic/finance clearances (`/students/transfers`)<br>21. Payment recording & allocation (`/finance/payments` -> `record_student_payment`)<br>22. Audit logs view (`/admin/audit-logs`, `/it/audit`)<br>23. IT ticketing system (`/it/tickets`)<br>24. Operational requests workflow (`/requests`) |
| **B** | **UI exists + backend missing** | 1. Dedicated NestJS REST API endpoints (`/api/v1/...`). Mutations currently go directly through Next.js Server Actions to Supabase client.<br>2. Authoritative Teacher Schedule REST API (`GET /api/v1/teachers/me/timetable` and `GET /api/v1/teachers/:id/timetable`).<br>3. Timetable dedicated printing endpoint generating formatted schedules.<br>4. UI action to trigger audit log archival and archive search. |
| **C** | **Backend exists + UI missing** | 1. `validate_stp_readiness(p_student_id uuid)` RPC exists in DB, but not directly wired into candidate grid.<br>2. `archive_audit_logs(p_older_than_days)` & `search_audit_archive` exist in DB, but lack dedicated UI buttons.<br>3. `reverse_student_payment` RPC exists in DB, but no UI modal for payment reversal.<br>4. `classrooms`, `departments`, `learning_areas` exist in DB, but lack standalone CRUD screens. |
| **D** | **Both exist but disconnected** | 1. `/academic/waec-stp` computes readiness via client heuristics rather than invoking `validate_stp_readiness`.<br>2. Duplicate placeholder classes named `Form 1A` created during testing exist in DB without assigned program or stream. |
| **E** | **Existing feature partially implemented** | 1. Senior House Master/Mistress permissions: defined in DAL, but needs dedicated backend oversight endpoints and audit controls.<br>2. Photo storage proxy in Next.js needs a production-grade file streaming service with strict MIME/size validation in NestJS. |
| **F** | **Existing feature is broken** | None critical. Next.js app passes linting (0 errors) and TypeScript compilation passes (0 errors). |
| **G** | **Duplicate implementations exist** | Two ways of recording student payments: historical direct insert vs `record_student_payment` RPC. The backend must standardize on the atomic transactional RPC / database layer. |
| **H** | **Security / Architecture risks** | 1. Next.js Server Actions have direct database write access using Supabase credentials; business logic is coupled to Next.js execution context.<br>2. Lack of application-level rate limiting on sensitive auth, staff creation, and password reset operations.<br>3. NestJS must validate Supabase JWT tokens server-side, check user `is_active`, and verify roles strictly from DB profile. |
| **I** | **Data integrity note** | 8 duplicate rows of 'Form 1A' exist in `classes` table with `stream: null` from development. Need safe soft-archival/cleanup without affecting any linked enrollments. |
| **J** | **Production migration missing** | None missing. Migrations 20260910 through 20261005 are confirmed deployed to the live database. |
| **K** | **Function in migration but not live DB** | None. 100% of defined functions are confirmed present in `information_schema.routines`. |
| **L** | **Database object exists but application doesn't use it** | 1. View `v_house_gender_distribution` is present in DB; frontend currently calculates counts manually.<br>2. Table `student_fee_charges` is present alongside `student_charges`. |

---

## 4. Live Production Database Baseline

- **Students**: 58 real enrolled students (20 Male, 38 Female).
- **Houses**: 4 houses with deterministic gender balancing:
  - Abubakar (ABU): 15 students (5M, 10F)
  - Ali (ALI): 15 students (5M, 10F)
  - Umar (UMR): 14 students (5M, 9F)
  - Uthman (UTH): 14 students (5M, 9F)
- **Academic Years**: `2026/2027` (Current, `6962dfe4-5134-417b-aa01-991fa4df38fe`), `2027/2028`.
- **Programs**:
  - General Arts (`GARTS`)
  - General Science (`GSCI`)
  - Business (`BUS`)
  - Home Economics (`HECON`)
  - General Agric (`GAGR`)
- **Key Roles Verified in DB**:
  - `admin`, `it_officer`, `headmaster`, `assistant_headmaster`, `academic_head`, `teacher`, `house_master`, `house_mistress`, `finance_officer`, `domestic_officer`, `general_staff`.
  - House responsibilities: `house_master`, `house_mistress`, `senior_house_master`, `senior_house_mistress`.

---

## 5. Architectural Standards for NestJS Backend

1. **API Uniform Contract**:
   - Success: `{ success: true, data: T, message: string, requestId: string, timestamp: string }`
   - Failure: `{ success: false, error: { code: string, message: string, details?: any }, requestId: string, timestamp: string }`
2. **Authentication & RBAC**:
   - `AuthGuard` extracts Bearer JWT, validates token with Supabase Auth / GoTrue, resolves user profile from `public.profiles`.
   - `RolesGuard` matches `@Roles(...)` against user's primary role and `additional_roles`.
   - Dedicated `@RequireHouseResponsibility(...)` decorator for House Master / Senior House Master roles.
3. **Database Layer**:
   - Dedicated `DatabaseModule` supporting both direct PostgreSQL connection pooling (`pg` / `pg-pool`) for high-performance atomic transactions and Supabase client wrapper for storage and auth operations.
4. **Independent Deployment**:
   - Located in `/backend` directory with dedicated `package.json`, `tsconfig.json`, `Dockerfile`, and test runner.
   - Deployable to Render, Railway, Fly.io, or any Node.js container host.
