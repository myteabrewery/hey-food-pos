-- Real HQ authentication (POST /auth/hq/login), replacing the HQ_ADMIN_KEY
-- shared-secret stand-in. Two changes:
--
-- 1. staff_users gains a real password credential, nullable (only
--    hq_admin/area_manager ever get one; outlet_staff never do — see
--    src/staff/password-hash.ts and StaffUser.passwordHash's doc comment).
--    No backfill: no existing row has a real password to compute.
--
-- 2. staff_sessions.outlet_id becomes nullable: an HQ session is never bound
--    to exactly one outlet (hq_admin sees all; an area_manager may have
--    several), unlike a POS session. Existing rows are all POS sessions with
--    a real outlet_id already, so no data migration is needed — this only
--    widens what a FUTURE row may contain.

-- AlterTable
ALTER TABLE "staff_users"
  ADD COLUMN "password_hash" TEXT,
  ADD COLUMN "password_changed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "staff_sessions" ALTER COLUMN "outlet_id" DROP NOT NULL;

-- An optional relation's FK defaults to ON DELETE SET NULL (Prisma's own
-- convention for optional relations, matched here for consistency, though
-- outlets are never deleted in practice — this is effectively moot).
-- DropForeignKey
ALTER TABLE "staff_sessions" DROP CONSTRAINT "staff_sessions_outlet_id_fkey";

-- AddForeignKey
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
