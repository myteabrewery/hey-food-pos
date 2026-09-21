import { z } from "zod";

import { paginatedResponseSchema } from "./common";
import { OrderStatusSchema } from "./entities";
import { CancelReasonSchema, OrderWithItemsSchema } from "./orders";

/**
 * HQ Orders (dev spec Section 9.4: "filterable table, links into the same order
 * detail data model"). NOT in dev spec Section 2's endpoint list: these routes are
 * an addition, documented in docs/STATUS.md:
 *
 *   GET  /admin/orders            filterable, cursor-paginated list, all outlets
 *   GET  /admin/orders/:id        one order in full
 *   POST /admin/orders/:id/cancel HQ cancellation (see the DEVIATION note below)
 *
 * TEMPORARY auth: the same shared `X-Hq-Admin-Key` as HQ Menu Management, which is
 * a stand-in, not authentication (backend README banner).
 */

/** A calendar day, "YYYY-MM-DD", in the business timezone (Asia/Kuala_Lumpur). */
export const BusinessDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "not a real calendar date");

/** Which surface cancelled an order. There is deliberately NO "who": no login exists to attribute it to. */
export const CancelSourceSchema = z.union([z.literal("hq"), z.literal("pos")]);
export type CancelSource = z.infer<typeof CancelSourceSchema>;

export const ADMIN_ORDER_DEFAULT_LIMIT = 25;
export const ADMIN_ORDER_MAX_LIMIT = 100;

/**
 * The default list view: every status EXCEPT `pending`. A pending order is one a
 * guest started and never paid for, so leaving them in would bury real orders.
 * They are one filter away.
 */
export const ADMIN_ORDER_DEFAULT_STATUSES = Object.values(OrderStatusSchema.enum).filter((status) => status !== "pending");

// GET /admin/orders
/**
 * Every value arrives as a query-string STRING, so this schema is the wire form:
 * `status` is a comma-separated list, `limit` is coerced. Unknown keys are an
 * error (`.strict()`), so a mistyped filter is told, not silently ignored.
 *
 * `from` / `to` are inclusive and filter on the order's BUSINESS DATE (the outlet-
 * local calendar day, Kuala Lumpur), not on raw timestamps, so "yesterday" means
 * the same day the POS's daily order numbers reset on.
 *
 * `q` matches the human display ID ("PM042"), case-insensitively, as a prefix. IDs
 * repeat across days and outlets, so it can match several orders.
 */
export const AdminOrderListQuerySchema = z
  .object({
    businessId: z.string().min(1),
    outletId: z.string().min(1).optional(),
    status: z
      .string()
      .min(1)
      .transform((value) => value.split(",").map((part) => part.trim()))
      .pipe(z.array(OrderStatusSchema).min(1))
      .optional(),
    from: BusinessDateSchema.optional(),
    to: BusinessDateSchema.optional(),
    q: z.string().trim().min(1).max(20).optional(),
    cursor: z.string().min(1).max(500).optional(),
    limit: z.coerce.number().int().min(1).max(ADMIN_ORDER_MAX_LIMIT).default(ADMIN_ORDER_DEFAULT_LIMIT),
  })
  .strict()
  .refine((query) => query.from === undefined || query.to === undefined || query.from <= query.to, {
    path: ["to"],
    message: "the end date is before the start date",
  });
export type AdminOrderListQuery = z.output<typeof AdminOrderListQuerySchema>;
/** What a client builds (before the query string is serialized). */
export type AdminOrderListQueryInput = z.input<typeof AdminOrderListQuerySchema>;

/**
 * Who placed the order, WITHOUT the personal details. The full phone number never
 * leaves the backend: this app has no login (backend README), so the list and detail
 * carry only a masked number (`+6019***0142`) to tell orders apart.
 */
export const AdminOrderCustomerSchema = z.object({
  kind: z.union([z.literal("app"), z.literal("guest")]),
  phoneMasked: z.string().nullable(),
});
export type AdminOrderCustomer = z.infer<typeof AdminOrderCustomerSchema>;

const OutletRefSchema = z.object({ id: z.string(), name: z.string() });

/** One row of the Orders table: a summary, deliberately without items or modifiers. */
export const AdminOrderListItemSchema = z.object({
  id: z.string(),
  displayId: z.string(),
  outlet: OutletRefSchema,
  status: OrderStatusSchema,
  createdAt: z.string().datetime(),
  businessDate: BusinessDateSchema,
  total: z.number(),
  /** Sum of line quantities. */
  itemCount: z.number().int(),
  customer: AdminOrderCustomerSchema,
  /** Marked paid by the payment STUB (no money moved): `paid_at` set but no payment row. */
  isStubPaid: z.boolean(),
  cancelReason: z.string().nullable(),
  cancelSource: CancelSourceSchema.nullable(),
});
export type AdminOrderListItem = z.infer<typeof AdminOrderListItemSchema>;

/**
 * `outlets` is the business's outlets (for the Outlet filter's choices), returned with
 * every page so the screen needs no second call.
 */
export const AdminOrderListResponseSchema = paginatedResponseSchema(AdminOrderListItemSchema).extend({
  outlets: z.array(OutletRefSchema),
});
export type AdminOrderListResponse = z.infer<typeof AdminOrderListResponseSchema>;

// GET /admin/orders/:id
export const AdminOrderPaymentSchema = z.object({
  /** `none` = not paid yet; `stub` = marked paid by the payment stub; `real` = a payment row exists. */
  kind: z.union([z.literal("none"), z.literal("stub"), z.literal("real")]),
  provider: z.string().nullable(),
  status: z.string().nullable(),
  amount: z.number().nullable(),
});
export type AdminOrderPayment = z.infer<typeof AdminOrderPaymentSchema>;

/**
 * One customer-notification attempt (`notification_logs`), the record spec Section 6
 * keeps to diagnose "the customer says they were never told". `delivered` is false on
 * every row today (nothing observes a delivery receipt) and `stub: true` means nothing
 * was actually sent. Fields other than id/channel/sentAt/delivered are read out of a
 * JSON payload whose shape has varied, so each may be null.
 */
export const AdminOrderNotificationSchema = z.object({
  id: z.string(),
  channel: z.string(),
  sentAt: z.string().datetime(),
  delivered: z.boolean(),
  event: z.string().nullable(),
  provider: z.string().nullable(),
  stub: z.boolean().nullable(),
  accepted: z.boolean().nullable(),
  error: z.string().nullable(),
});
export type AdminOrderNotification = z.infer<typeof AdminOrderNotificationSchema>;

export const AdminOrderDetailSchema = z.object({
  /** The shared order shape: items with modifiers, every transition timestamp, cancel reason. */
  order: OrderWithItemsSchema,
  outlet: OutletRefSchema,
  businessDate: BusinessDateSchema,
  customer: AdminOrderCustomerSchema,
  payment: AdminOrderPaymentSchema,
  /** Which surface cancelled it (hq | pos); null if not cancelled. Not in the shared Order on purpose. */
  cancelSource: CancelSourceSchema.nullable(),
  /** Oldest first. */
  notifications: z.array(AdminOrderNotificationSchema),
});
export type AdminOrderDetail = z.infer<typeof AdminOrderDetailSchema>;
export const AdminOrderDetailResponseSchema = AdminOrderDetailSchema;
export type AdminOrderDetailResponse = AdminOrderDetail;

// POST /admin/orders/:id/cancel
/**
 * DEVIATION FROM DEV SPEC SECTION 2, which has ONE shared `POST /orders/:id/cancel`
 * for customer, staff and HQ (that route was never built; the POS has its own
 * `POST /pos/orders/:id/cancel` and rejects `actor: "hq"`). HQ cancellation is its
 * own route under `/admin`, behind the HQ admin key, so it can never be reached with
 * the POS device key (and the reverse).
 *
 * The body is the `hq` branch of `CancelOrderRequestSchema`, made `.strict()` (the
 * shared union silently drops unknown keys), plus one HQ-specific rule: when the
 * reason is `other`, a description is REQUIRED (the POS allows a blank one). With no
 * login there is no "who", so the words are the only explanation of why HQ cancelled.
 *
 * The response is the refreshed order detail.
 */
export const MAX_CANCEL_DETAIL_LENGTH = 200;
export const AdminCancelOrderRequestSchema = z
  .object({
    actor: z.literal("hq"),
    reason: CancelReasonSchema,
    otherDetail: z.string().optional(),
  })
  .strict()
  .superRefine((request, ctx) => {
    if (request.reason !== "other") return;
    const detail = request.otherDetail?.trim() ?? "";
    if (detail.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherDetail"], message: "describe why (required when the reason is Other)" });
    } else if (detail.length > MAX_CANCEL_DETAIL_LENGTH) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["otherDetail"], message: `at most ${MAX_CANCEL_DETAIL_LENGTH} characters` });
    }
  });
export type AdminCancelOrderRequest = z.infer<typeof AdminCancelOrderRequestSchema>;
export const AdminCancelOrderResponseSchema = AdminOrderDetailSchema;
export type AdminCancelOrderResponse = AdminOrderDetail;
