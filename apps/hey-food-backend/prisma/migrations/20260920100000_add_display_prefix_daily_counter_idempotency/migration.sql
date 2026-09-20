-- Order display IDs become outlet-prefixed and per-day (dev spec Sections 1/3:
-- "PM001, PM002, ... resetting at midnight local time"), replacing the
-- schema's earlier globally-unique display_id. Also adds the idempotency
-- columns used by POST /guest/orders.
--
-- Prisma generated the structural DDL below; the two NOT NULL additions on
-- tables that may already hold rows (outlets.display_prefix,
-- orders.business_date / daily_seq) are hand-edited into add-nullable ->
-- backfill -> SET NOT NULL so the migration applies to a populated dev DB.

-- DropIndex
DROP INDEX "orders_display_id_key";

-- AlterTable: outlets.display_prefix (nullable first, backfilled below)
ALTER TABLE "outlets" ADD COLUMN "display_prefix" TEXT;

UPDATE "outlets" SET "display_prefix" = CASE "id"
    WHEN 'outlet_paradigm_mall'    THEN 'PM'
    WHEN 'outlet_ksl_city'         THEN 'KC'
    WHEN 'outlet_mid_valley'       THEN 'MV'
    WHEN 'outlet_soup_stall_main'  THEN 'SS'
    ELSE UPPER(LEFT(REGEXP_REPLACE("id", '^outlet_', ''), 2))
END;

ALTER TABLE "outlets" ALTER COLUMN "display_prefix" SET NOT NULL;

-- AlterTable: orders (nullable first, backfilled below)
ALTER TABLE "orders" ADD COLUMN "business_date" DATE,
ADD COLUMN "daily_seq" INTEGER,
ADD COLUMN "idempotency_fingerprint" TEXT,
ADD COLUMN "idempotency_key" TEXT;

-- Existing orders: business day = the Malaysian calendar day they were
-- created on; sequence = the digits already in their display_id (0 if none).
UPDATE "orders" SET
    "business_date" = ("created_at" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kuala_Lumpur')::date,
    "daily_seq" = COALESCE(NULLIF(REGEXP_REPLACE("display_id", '\D', '', 'g'), '')::int, 0);

ALTER TABLE "orders" ALTER COLUMN "business_date" SET NOT NULL,
ALTER COLUMN "daily_seq" SET NOT NULL;

-- CreateTable
CREATE TABLE "order_daily_counters" (
    "outlet_id" TEXT NOT NULL,
    "business_date" DATE NOT NULL,
    "last_seq" INTEGER NOT NULL,

    CONSTRAINT "order_daily_counters_pkey" PRIMARY KEY ("outlet_id","business_date")
);

-- Seed each counter from the orders that already exist, so the next number
-- issued for a day continues after them instead of colliding.
INSERT INTO "order_daily_counters" ("outlet_id", "business_date", "last_seq")
SELECT "outlet_id", "business_date", MAX("daily_seq") FROM "orders" GROUP BY "outlet_id", "business_date";

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "orders_outlet_day_display_id_key" ON "orders"("outlet_id", "business_date", "display_id");

-- CreateIndex
CREATE UNIQUE INDEX "outlets_business_id_display_prefix_key" ON "outlets"("business_id", "display_prefix");

-- AddForeignKey
ALTER TABLE "order_daily_counters" ADD CONSTRAINT "order_daily_counters_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
