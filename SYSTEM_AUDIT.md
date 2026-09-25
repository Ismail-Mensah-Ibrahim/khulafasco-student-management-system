# Khulafasco Student Management System — Comprehensive System Audit

## 1. System Health & Architecture Status

This audit has been performed through deep read-only inspection of:
- All 24 Supabase migration files in `supabase/migrations/`
- Live PostgreSQL 15 database schema (`information_schema.tables`, `information_schema.routines`, `pg_constraint`, `pg_indexes`)
- 58 live enrolled student records (20 male, 38 female) across 4 houses
- 10 live staff profiles and multi-role configurations
- All Server Actions, DAL functions, data access queries, API routes, and components
- Next.js 16 (React 19) frontend compilation and NestJS 11 backend compilation

---

## 2. Issue Categorization (A through D)

### A. CRITICAL ISSUES
1. **Finance Dashboard Metrics Academic-Year Leakage**: In `src/lib/data.ts` (`getFinanceDashboardMetrics`), `studentQuery` is filtered by `currentAcademicYear.id`, but `paymentsQuery` selects all payments from `public.payments` across all academic years without filtering by students enrolled in the current year. This causes `totalCollected` to aggregate all historical payments rather than the current academic period.
2. **Staff Creation via Client Auth SignUp**: In `src/lib/actions/admin.ts` (`createStaffAction`), staff accounts are created via `supabase.auth.signUp(...)` instead of `adminClient.auth.admin.createUser({ email_confirm: true })`. If Supabase email confirmation is enabled, newly created staff accounts are left unconfirmed, and profile creation failures do not clean up auth users.
3. **Missing Payment Reversal Action**: `reverse_student_payment` RPC exists in PostgreSQL (migration 20261004) with audit logging and row locking, but no Server Action or UI in `/finance/payments` exposes it. Finance officers currently have no authorized way to reverse misallocated or voided payments.

### B. HIGH ISSUES
1. **Stale UI after Payments Mutation**: In `src/lib/actions/finance.ts`, `recordStudentPaymentAction` only revalidates `/finance`. It fails to revalidate `/finance/payments` and `/finance/receipts`, causing the user to see stale payment history or blank receipts after recording.
2. **Transfer Reference Generation Fallback**: In `src/lib/actions/transfers.ts` (`generateReference`), if `generate_transfer_reference` RPC fails, it falls back to `STP-${year}-${Math.random()}`. The database sequence `seq_student_transfer_ref` and RPC already exist and work, so any failure should be handled as a genuine backend error rather than masked by random unsequenced numbers.
3. **Unchecked Duplicate Class Names in Database**: Development testing left multiple orphan rows with name `"Form 1A"` (stream null) in `classes` table. Classes must require stream specification or have deduplicated constraints for active classes in the same academic year.
4. **Promotion Batch Atomicity**: `executeStudentPromotionAction` in `src/lib/actions/promotion.ts` executes sequential per-student updates in a loop without rollback if a student midway fails. It must integrate with `promote_student` RPC and record a `promotion_batches` parent transaction.

### C. MEDIUM ISSUES
1. **Disconnected WAEC STP RPC**: In `/academic/waec-stp`, candidate readiness is computed via client-side heuristics instead of calling the authoritative `validate_stp_readiness(p_student_id)` database function.
2. **Missing UI for Audit Archival**: `archive_audit_logs(p_older_than_days)` and `search_audit_archive` exist in Postgres, but `/admin/audit-logs` lacks an archival trigger button and archived log search view.
3. **Hardcoded Grade Boundaries in Actions**: `calculateGradeAndRemarks` in `src/lib/actions/academics.ts` hardcodes grade thresholds (80 = A1, etc.) inside the action file instead of a centralized grading service.
4. **House Gender Allocation Redundancy**: `getHouseDistributions` calculates house student gender counts in JavaScript loops, while view `v_house_gender_distribution` is already defined in PostgreSQL.

### D. LOW ISSUES
1. Unused imports in `TimetableManager.tsx` and `StaffManagementClient.tsx` (17 lint warnings).
2. Missing CRUD screens for operational tables `departments`, `classrooms`, `learning_areas`.

---

## 3. Verified Working Features (E)

1. **Student Registration & Biodata**: Verified with `enroll_student` RPC; prevents duplicate JHS index numbers.
2. **House Distribution & Deterministic Gender Balancing**: 4 houses (Abubakar, Umar, Uthman, Ali) balanced to mathematical precision (5 males per house; 10, 10, 9, 9 females).
3. **Staff Multi-Role & Responsibilities**: Verified in DB (`Dennis Ewuah Dadzie` = Teacher + House Master; `Ibrahim Harun` = Teacher + Senior House Master).
4. **Timetable Slot Conflict Detection**: Double-booking for teachers, classes, and rooms is prevented.
5. **Staff Deletion Architecture**: Safety check (`check_staff_deletion_safety`) -> Auth Admin API deletion -> `finalize_staff_deletion` RPC -> comprehensive audit log.
6. **Student Photo Storage**: Public/private bucket handling with MIME and size limits.

---

## 4. Database Drift Analysis (G)

- **Applied Migrations**: All 24 migrations (20260910 through 20261005) are recorded in `supabase_migrations.schema_migrations`.
- **Functions in Live Database**: 100% of referenced RPCs exist in `information_schema.routines`.
- **Conclusion**: There is zero schema drift between repository migrations and the live database.

---

## 5. Security & Safety Risks (H)

1. **Secret Isolation**: `SUPABASE_SERVICE_ROLE_KEY` is strictly server-side and never exposed to the client bundle.
2. **RLS Policies**: Row Level Security is enabled across all 25+ production tables.
3. **IDOR & Privilege Escalation Protection**: Server-side session verification via `verifySession()` and `requireRole(...)` is strictly enforced before database queries.

---

## 6. Implementation Plan (I)

### Phase A: Core Architecture Layering (`src/lib/`)
1. Create `src/lib/errors/` with typed, centralized application error definitions.
2. Create `src/lib/permissions/` with centralized role + responsibility checks.
3. Create `src/lib/audit/` with centralized logging and archival helpers.
4. Create `src/lib/notifications/` with in-app notification services.
5. Create `src/lib/services/`:
   - `finance.service.ts`: Fix academic-year metrics leak, implement payment reversal.
   - `timetable.service.ts`: Timetable generation, teacher personal schedule, printing.
   - `transfer.service.ts`: Authoritative reference generator, transfer lifecycle.
   - `staff.service.ts`: Hardened staff creation via Auth Admin API, safe deletion.
   - `student.service.ts`: Student lifecycle and photo helpers.
   - `stp.service.ts`: Authoritative WAEC STP readiness checks.
   - `promotion.service.ts`: Batch promotion with `promotion_batches`.

### Phase B: Frontend Integration & Mutation Hardening
1. Update `recordStudentPaymentAction` to revalidate all finance paths (`/finance`, `/finance/payments`, `/finance/receipts`).
2. Add `reversePaymentAction` and connect to finance UI.
3. Update `createStaffAction` to use Auth Admin API with auto-confirm and rollback.
4. Clean up `generateReference` in `transfers.ts` to strictly require the database RPC.
5. Add audit archival action and connect to `/admin/audit-logs`.
6. Implement `GET /api/v1/teachers/me/timetable` and teacher schedule printing format.

### Phase C: Verification & Testing
1. Run full unit and integration tests.
2. Verify all Next.js builds, lints, and types.
3. Verify live database contracts without altering real student or financial records.
