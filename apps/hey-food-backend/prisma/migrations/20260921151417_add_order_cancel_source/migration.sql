-- Which surface cancelled an order (hq | pos), and the index HQ's Orders list pages on.
-- WHERE, never WHO: no authentication exists to attribute a cancel to (docs/STATUS.md,
-- audit trail). Set together with the cancel; NULL means "not cancelled".

-- CreateEnum
CREATE TYPE "cancel_source" AS ENUM ('hq', 'pos');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancel_source" "cancel_source";

-- Backfill: until this migration the POS's staff cancel was the ONLY way an order
-- could be cancelled (HQ cancel did not exist), so every already-cancelled order was
-- cancelled from the POS.
UPDATE "orders" SET "cancel_source" = 'pos' WHERE "status" = 'cancelled';

-- CreateIndex
CREATE INDEX "orders_created_at_id_idx" ON "orders"("created_at" DESC, "id" DESC);
