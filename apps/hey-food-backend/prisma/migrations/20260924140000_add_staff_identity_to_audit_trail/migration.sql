-- Retrofit real staff identity onto the existing audit gaps (orders' staff-
-- actioned transitions and cancellation; menu_change_events), now that real
-- StaffSession auth exists to provide it. All new columns are nullable, with
-- NO backfill and NO CHECK constraint: every existing row predates real POS
-- staff auth, so there is no correct staffId to compute for it, and every
-- automatic transition (paid->received on sync; an HQ cancel/menu change,
-- which has no session identity at all) genuinely has no human actor.

-- AlterTable
ALTER TABLE "orders"
  ADD COLUMN "preparing_by_staff_id" TEXT,
  ADD COLUMN "ready_by_staff_id" TEXT,
  ADD COLUMN "collected_by_staff_id" TEXT,
  ADD COLUMN "cancelled_by_staff_id" TEXT;

-- AlterTable
ALTER TABLE "menu_change_events"
  ADD COLUMN "changed_by_staff_id" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_preparing_by_staff_id_fkey" FOREIGN KEY ("preparing_by_staff_id") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_ready_by_staff_id_fkey" FOREIGN KEY ("ready_by_staff_id") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_collected_by_staff_id_fkey" FOREIGN KEY ("collected_by_staff_id") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancelled_by_staff_id_fkey" FOREIGN KEY ("cancelled_by_staff_id") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_change_events" ADD CONSTRAINT "menu_change_events_changed_by_staff_id_fkey" FOREIGN KEY ("changed_by_staff_id") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
