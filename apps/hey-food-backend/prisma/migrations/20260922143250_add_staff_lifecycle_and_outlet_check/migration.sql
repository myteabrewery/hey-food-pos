-- AlterTable
ALTER TABLE "staff_users" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pin_changed_at" TIMESTAMP(3);

-- Backfill: every existing row's PIN was set at some point no longer recorded;
-- "now" is the honest answer ("we don't know exactly when, treat it as just
-- changed") rather than a fabricated earlier date.
UPDATE "staff_users" SET "pin_changed_at" = CURRENT_TIMESTAMP WHERE "pin_changed_at" IS NULL;

ALTER TABLE "staff_users" ALTER COLUMN "pin_changed_at" SET NOT NULL;

-- Data fix: an hq_admin sees every outlet BECAUSE of the role, not because it
-- lists them (StaffUser's doc comment) — but the seeded hq_admin row listed all
-- three outlets, which the CHECK below now rejects. Clear it before adding the
-- constraint so it applies cleanly.
UPDATE "staff_users" SET "assigned_outlet_ids" = '{}' WHERE "role" = 'hq_admin';

-- Hand-written (Prisma's schema language can't express CHECK constraints, same
-- as orders_cancel_detail_only_for_other): the role/outlet-assignment invariant
-- (blueprint Section 13) holds even for a row written outside the admin API.
-- hq_admin -> no outlets listed; outlet_staff -> exactly one (dev spec 5.5's
-- device-outlet binding assumes a single staff-outlet pairing); area_manager ->
-- one or more.
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_outlet_assignment_matches_role" CHECK (
  ("role" = 'hq_admin' AND cardinality("assigned_outlet_ids") = 0)
  OR ("role" = 'outlet_staff' AND cardinality("assigned_outlet_ids") = 1)
  OR ("role" = 'area_manager' AND cardinality("assigned_outlet_ids") >= 1)
);
