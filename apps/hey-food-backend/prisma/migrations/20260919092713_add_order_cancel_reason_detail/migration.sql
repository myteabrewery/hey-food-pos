-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancel_reason_detail" TEXT;

-- Hand-written (Prisma's schema language can't express CHECK constraints).
-- The free-text detail exists only for the "other" reason — for every
-- other reason (and for orders that were never cancelled) it must be NULL,
-- so cancel_reason stays a clean, groupable value and the detail can never
-- be attached to a reason it doesn't belong to. The explicit IS NOT NULL matters:
-- with cancel_reason NULL, "cancel_reason = 'other'" is NULL (unknown), and a
-- CHECK treats unknown as passing, which would let a detail through with no
-- reason at all. Every existing row has a
-- NULL detail, so it satisfies the constraint — no backfill needed.
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancel_detail_only_for_other" CHECK (
  "cancel_reason_detail" IS NULL
  OR ("cancel_reason" IS NOT NULL AND "cancel_reason" = 'other')
);
