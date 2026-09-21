-- Append-only record of menu changes (HQ and POS): what changed, from what to what,
-- when, and from which surface. Deliberately no actor column: no authentication
-- exists to attribute a change to (see docs/STATUS.md, audit trail).

-- CreateEnum
CREATE TYPE "menu_change_source" AS ENUM ('hq', 'pos');

-- CreateTable
CREATE TABLE "menu_change_events" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "outlet_id" TEXT,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "source" "menu_change_source" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_change_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_change_events_product_id_changed_at_idx" ON "menu_change_events"("product_id", "changed_at");

-- CreateIndex
CREATE INDEX "menu_change_events_business_id_changed_at_idx" ON "menu_change_events"("business_id", "changed_at");

-- AddForeignKey
ALTER TABLE "menu_change_events" ADD CONSTRAINT "menu_change_events_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_change_events" ADD CONSTRAINT "menu_change_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_change_events" ADD CONSTRAINT "menu_change_events_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
