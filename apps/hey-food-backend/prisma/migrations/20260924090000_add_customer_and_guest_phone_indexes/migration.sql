-- CreateIndex
-- HQ Customers (dev spec Section 9.4): app-account list pages newest-first
-- with a keyset cursor over (created_at, id), same pattern as orders.
CREATE INDEX "customers_created_at_id_idx" ON "customers"("created_at" DESC, "id" DESC);

-- CreateIndex
-- HQ Customers' "Guest Orders by Phone" view groups and filters on this
-- (NULL for app-based orders, so the index only helps guest lookups).
CREATE INDEX "orders_guest_phone_idx" ON "orders"("guest_phone");
