-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "guest_phone" TEXT,
ADD COLUMN     "guest_token_hash" TEXT,
ALTER COLUMN "customer_id" DROP NOT NULL;

-- Hand-written (Prisma's schema language can't express CHECK constraints).
-- An order is exactly one of: app-based (customer_id set, no guest fields)
-- or guest (customer_id null, guest_phone AND guest_token_hash both set).
-- Every pre-existing row has customer_id NOT NULL and both guest columns
-- NULL, so it satisfies the first branch — no backfill needed.
ALTER TABLE "orders" ADD CONSTRAINT "orders_identity_xor" CHECK (
  (
    "customer_id" IS NOT NULL
    AND "guest_phone" IS NULL
    AND "guest_token_hash" IS NULL
  )
  OR (
    "customer_id" IS NULL
    AND "guest_phone" IS NOT NULL
    AND "guest_token_hash" IS NOT NULL
  )
);
