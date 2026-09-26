import { z } from "zod";

import { OutletRefSchema, paginatedResponseSchema } from "./common";
import { OrderStatusSchema } from "./entities";

/**
 * HQ Customers (dev spec Section 2/9.4: "central `Customer` record — order
 * history query spans all outlets naturally"). TWO views, not one, because
 * of what data actually exists:
 *
 * - **App Accounts** (`AdminCustomer*`): the real `Customer` entity the spec
 *   describes. Today there is exactly one row (the seed) — nothing creates a
 *   `Customer` outside the seed script until `POST /auth/customer/otp/verify`
 *   (customer OTP auth) exists, since guest checkout deliberately never
 *   creates one (`orders_identity_xor`). Built anyway, honestly labeled as
 *   near-empty for now: it's the spec's actual data model, it's cheap given
 *   the loyalty system (`Customer.loyaltyPoints`) already depends on this
 *   entity, and it becomes real the moment OTP auth ships.
 * - **Guest Orders by Phone** (`AdminGuestCustomer*`): NOT a real entity —
 *   guest orders (`guestPhone` set, `customerId` null) grouped by phone at
 *   query time. This is the view with genuinely growing real data today,
 *   since guest web checkout is live.
 *
 * Neither `GET /admin/customers` (list) nor either guest-customer route is in
 * dev spec Section 2, which only has `GET /admin/customers/:id` — same
 * situation as `GET /admin/orders` before it: added when the screen was
 * built, documented in docs/STATUS.md, not a deviation.
 *
 * Personal data: exactly the Orders precedent — the full phone number never
 * leaves the backend. `AdminCustomerSchema` and `AdminGuestCustomerListItemSchema`/
 * `AdminGuestCustomerDetailResponseSchema` only ever carry `phoneMasked`.
 *
 * Read-only: dev spec Section 9.4's Customers bullet describes no action
 * beyond viewing (unlike Orders, which got an HQ-cancel deviation) — there is
 * no write endpoint here.
 */

export const ADMIN_CUSTOMER_DEFAULT_LIMIT = 25;
export const ADMIN_CUSTOMER_MAX_LIMIT = 100;

/** The `Customer` entity, WITHOUT the full phone number (Orders' masking precedent). */
export const AdminCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phoneMasked: z.string(),
  createdAt: z.string().datetime(),
  loyaltyPoints: z.number(),
});
export type AdminCustomer = z.infer<typeof AdminCustomerSchema>;

/**
 * One order inside a customer's (or guest phone's) order history — deliberately
 * LEAN, not the full `OrderWithItems`: dev spec Section 9.4 says a Customers
 * screen's history "links into the same order detail data model" (its own
 * words for Orders), so a row here is exactly enough to list and link into
 * the already-built HQ Order detail page (`/orders/:id`), not a second copy
 * of items/modifiers to keep in sync.
 */
export const AdminCustomerOrderHistoryItemSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  outlet: OutletRefSchema,
  status: OrderStatusSchema,
  createdAt: z.string().datetime(),
  total: z.number(),
  itemCount: z.number().int(),
});
export type AdminCustomerOrderHistoryItem = z.infer<typeof AdminCustomerOrderHistoryItemSchema>;

// ---------------------------------------------------------------------------
// App Accounts
// ---------------------------------------------------------------------------

// GET /admin/customers
/**
 * `q` matches a customer's name or phone (server-side only — the raw phone is
 * never returned, only used to filter). Scoped to customers who have placed
 * at least one order at one of THIS business's outlets — `Customer` itself
 * carries no `businessId` (it's a platform-wide "one account" identity, per
 * `auth.ts`), so without this an HQ session for one business could browse
 * every customer on the platform, including ones who never ordered from it.
 * `businessId` itself comes from the calling session, never the client.
 */
export const AdminCustomerListQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(50).optional(),
    cursor: z.string().min(1).max(500).optional(),
    limit: z.coerce.number().int().min(1).max(ADMIN_CUSTOMER_MAX_LIMIT).default(ADMIN_CUSTOMER_DEFAULT_LIMIT),
  })
  .strict();
export type AdminCustomerListQuery = z.output<typeof AdminCustomerListQuerySchema>;
export type AdminCustomerListQueryInput = z.input<typeof AdminCustomerListQuerySchema>;

/**
 * `orderCount`/`lifetimeValue` count only orders that got past checkout and
 * were never cancelled (excludes `pending` — an unpaid checkout — and
 * `cancelled`), scoped to THIS business's outlets. A judgment call: dev spec
 * only says "lifetime value", not what counts toward it; this is "money the
 * customer actually committed to and kept", matching `ADMIN_ORDER_DEFAULT_STATUSES`
 * minus `cancelled`.
 */
export const AdminCustomerListItemSchema = AdminCustomerSchema.extend({
  orderCount: z.number().int(),
  lifetimeValue: z.number(),
});
export type AdminCustomerListItem = z.infer<typeof AdminCustomerListItemSchema>;

export const AdminCustomerListResponseSchema = paginatedResponseSchema(AdminCustomerListItemSchema);
export type AdminCustomerListResponse = z.infer<typeof AdminCustomerListResponseSchema>;

// GET /admin/customers/:id
/**
 * `orderHistory` is cursor-paginated (same global convention, decision #3) and
 * nested under the detail response — dev spec Section 2 defines only this one
 * endpoint for "order history, lifetime value", so there's no separate
 * history endpoint to paginate against instead. Unlike `orderCount`/
 * `lifetimeValue`, the history itself shows EVERY order regardless of status
 * (including pending/cancelled ones, each with its own status) — it's this
 * customer's real history, not a filtered metric.
 */
export const AdminCustomerDetailQuerySchema = z
  .object({
    cursor: z.string().min(1).max(500).optional(),
    limit: z.coerce.number().int().min(1).max(ADMIN_CUSTOMER_MAX_LIMIT).default(ADMIN_CUSTOMER_DEFAULT_LIMIT),
  })
  .strict();
export type AdminCustomerDetailQuery = z.output<typeof AdminCustomerDetailQuerySchema>;
export type AdminCustomerDetailQueryInput = z.input<typeof AdminCustomerDetailQuerySchema>;

export const AdminCustomerDetailResponseSchema = z.object({
  customer: AdminCustomerSchema,
  orderCount: z.number().int(),
  lifetimeValue: z.number(),
  orderHistory: paginatedResponseSchema(AdminCustomerOrderHistoryItemSchema),
});
export type AdminCustomerDetailResponse = z.infer<typeof AdminCustomerDetailResponseSchema>;

// ---------------------------------------------------------------------------
// Guest Orders by Phone
// ---------------------------------------------------------------------------

// GET /admin/guest-customers
/** `q` matches a guest phone number (server-side only, same rule as above). */
export const AdminGuestCustomerListQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(20).optional(),
    cursor: z.string().min(1).max(500).optional(),
    limit: z.coerce.number().int().min(1).max(ADMIN_CUSTOMER_MAX_LIMIT).default(ADMIN_CUSTOMER_DEFAULT_LIMIT),
  })
  .strict();
export type AdminGuestCustomerListQuery = z.output<typeof AdminGuestCustomerListQuerySchema>;
export type AdminGuestCustomerListQueryInput = z.input<typeof AdminGuestCustomerListQuerySchema>;

/**
 * `key` identifies a guest phone WITHOUT being it or exposing it: it's a
 * one-way hash of the raw phone, computed server-side, used only to fetch
 * this exact group's detail. There's no `Customer`-like row to hand out an id
 * for — this whole view is orders grouped by phone at query time.
 */
/** `orderCount`/`lifetimeValue` use the same "excludes pending/cancelled" rule as the App Accounts view. */
export const AdminGuestCustomerListItemSchema = z.object({
  key: z.string(),
  phoneMasked: z.string(),
  orderCount: z.number().int(),
  lifetimeValue: z.number(),
  firstOrderAt: z.string().datetime(),
  lastOrderAt: z.string().datetime(),
});
export type AdminGuestCustomerListItem = z.infer<typeof AdminGuestCustomerListItemSchema>;

/**
 * The wire shape is the same opaque cursor as every other paginated list, but
 * the implementation underneath is NOT a true keyset cursor like Orders' —
 * there's no indexed row to keyset over, only a live `GROUP BY guestPhone`
 * aggregate, so this is an offset encoded inside the opaque cursor. See
 * AdminCustomersService's doc comment for what that costs (a page boundary
 * can shift by one row if a new guest order lands between two page fetches)
 * and why it's an acceptable, documented trade-off today.
 */
export const AdminGuestCustomerListResponseSchema = paginatedResponseSchema(AdminGuestCustomerListItemSchema);
export type AdminGuestCustomerListResponse = z.infer<typeof AdminGuestCustomerListResponseSchema>;

// GET /admin/guest-customers/:key
/** Same pagination shape as the App Accounts detail above. */
export const AdminGuestCustomerDetailQuerySchema = z
  .object({
    cursor: z.string().min(1).max(500).optional(),
    limit: z.coerce.number().int().min(1).max(ADMIN_CUSTOMER_MAX_LIMIT).default(ADMIN_CUSTOMER_DEFAULT_LIMIT),
  })
  .strict();
export type AdminGuestCustomerDetailQuery = z.output<typeof AdminGuestCustomerDetailQuerySchema>;
export type AdminGuestCustomerDetailQueryInput = z.input<typeof AdminGuestCustomerDetailQuerySchema>;

/**
 * `orderCount`/`lifetimeValue` use the same rule as the App Accounts view
 * (excludes `pending` and `cancelled`, scoped to this business) for the same
 * reason; `orderHistory` again shows every order regardless of status.
 */
export const AdminGuestCustomerDetailResponseSchema = z.object({
  key: z.string(),
  phoneMasked: z.string(),
  orderCount: z.number().int(),
  lifetimeValue: z.number(),
  firstOrderAt: z.string().datetime(),
  lastOrderAt: z.string().datetime(),
  orderHistory: paginatedResponseSchema(AdminCustomerOrderHistoryItemSchema),
});
export type AdminGuestCustomerDetailResponse = z.infer<typeof AdminGuestCustomerDetailResponseSchema>;
