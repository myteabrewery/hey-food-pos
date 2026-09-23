import { z } from "zod";

import { OrderItemSchema, OrderSchema } from "./entities";
import { GuestPhoneSchema } from "./phone";

/**
 * `Order` + embedded `items`, per cross-cutting decision #2 — every order
 * response nests items inline rather than requiring a separate call.
 */
export const OrderWithItemsSchema = OrderSchema.extend({
  items: z.array(OrderItemSchema),
});
export type OrderWithItems = z.infer<typeof OrderWithItemsSchema>;

// POST /orders
/**
 * docs/product-customization-v2.md — supersedes v1's
 * `selectedModifierOptionIds: string[]`. `quantity` here is per-option
 * ("how much of this one ingredient"), separate from the count of
 * distinct options selected in a group (that's what a group's
 * `minSelections`/`maxSelections` bound). Only the option ID and
 * quantity travel — never a price; the backend resolves both against
 * the product's actual modifier options and computes each
 * `priceDeltaSnapshot` server-side (same "never trust client-computed
 * price" rule as the rest of this API).
 */
export const SelectedModifierOptionSchema = z.object({
  optionId: z.string(),
  quantity: z.number().int().positive(),
});
export type SelectedModifierOption = z.infer<typeof SelectedModifierOptionSchema>;

export const CreateOrderItemInputSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  selectedModifierOptions: z.array(SelectedModifierOptionSchema),
});
export type CreateOrderItemInput = z.infer<typeof CreateOrderItemInputSchema>;

/**
 * No `customerId` and no prices — `customerId` is resolved from the auth
 * token server-side (cross-cutting decision #4), and `subtotal`/
 * `serviceFee`/`total` are computed server-side from the current resolved
 * menu, never trusted from the client.
 */
export const CreateOrderRequestSchema = z.object({
  outletId: z.string(),
  items: z.array(CreateOrderItemInputSchema).min(1),
});
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const CreateOrderResponseSchema = OrderWithItemsSchema;
export type CreateOrderResponse = OrderWithItems;

// POST /guest/orders (guest web checkout — NOT in dev spec Section 2; see docs/STATUS.md "Guest web checkout")
/**
 * The guest-checkout twin of `CreateOrderRequestSchema`: identical `outletId`
 * + `items` (built with `.extend`, so the item shape — and therefore the
 * server-side modifier validation that runs on it — can never drift from the
 * app flow's), plus the one thing a guest supplies in place of an auth
 * token's identity: a phone number.
 *
 * `POST /orders` deliberately does NOT get this field: it stays strictly
 * "authenticated customer required, `customerId` from the token, nothing
 * identity-related in the body". `guestPhone` is only legitimate here
 * because it's this endpoint's sole identity.
 *
 * Input is whatever the customer typed; parsing yields canonical E.164 (see
 * `GuestPhoneSchema`), so the server never handles a raw variant.
 */
export const CreateGuestOrderRequestSchema = CreateOrderRequestSchema.extend({
  guestPhone: GuestPhoneSchema,
});
/** What a client sends (raw phone text) — use this for the request body/form. */
export type CreateGuestOrderRequest = z.input<typeof CreateGuestOrderRequestSchema>;
/** What the server holds after parsing (phone normalized to E.164). */
export type ParsedCreateGuestOrderRequest = z.output<typeof CreateGuestOrderRequestSchema>;

/**
 * A normal order (`customerId: null` for a guest — see `Order`) plus
 * `guestToken`: the unguessable proof of ownership for this one order,
 * returned exactly once here. Only its hash is stored server-side, so it
 * can't be recovered later — the web app keeps it (in memory /
 * `sessionStorage`) and presents it on the guest's pay/status calls, which
 * have no other auth. It is presented as `Authorization: Bearer <guestToken>`
 * on `GET /orders/:id` and `POST /orders/:id/pay` — a header, never a URL
 * query, so it can't leak into access logs or referrers.
 *
 * Replaying the same `Idempotency-Key` returns the SAME order with a freshly
 * rotated `guestToken` (the original can't be re-issued — only its hash is
 * stored — and a client retrying after a lost response never saw it). The
 * previous token stops working.
 */
export const CreateGuestOrderResponseSchema = OrderWithItemsSchema.extend({
  guestToken: z.string(),
});
export type CreateGuestOrderResponse = z.infer<typeof CreateGuestOrderResponseSchema>;

// POST /orders/:id/pay
export const PayOrderResponseSchema = z.object({
  redirectUrl: z.string(),
  /**
   * TEMPORARY — true when the backend's payment STUB marked the order paid
   * instead of a real Billplz payment (no money moved). Lets a client label
   * the result as a test-mode order. Disappears (always absent) once Billplz
   * replaces the stub.
   */
  isStub: z.boolean().optional(),
});
export type PayOrderResponse = z.infer<typeof PayOrderResponseSchema>;

// GET /orders/:id
export const OrderDetailResponseSchema = OrderWithItemsSchema;
export type OrderDetailResponse = OrderWithItems;

// GET /pos/outlets/:outletId/orders
/**
 * The outlet's live queue: every order that is paid and not yet collected
 * or cancelled (`paid`, `received`, `preparing`, `ready`), oldest first.
 * Auth: a real staff PIN session (`Authorization: Bearer`, from
 * `POST /auth/staff/login`), scoped to that session's own outlet regardless
 * of the `:outletId` in the URL — see docs/STATUS.md.
 */
export const PosQueueResponseSchema = z.object({
  data: z.array(OrderWithItemsSchema),
});
export type PosQueueResponse = z.infer<typeof PosQueueResponseSchema>;

// PATCH /pos/orders/:id/status
/**
 * Narrowed to the three transitions staff can legally trigger (dev spec
 * Section 3) — `paid`/`received` are webhook/sync-driven, `completed` is
 * automatic on `collected`, and `cancelled` has its own endpoint. This
 * encodes the state machine rule at the type level, not just at runtime.
 */
export const PosOrderStatusSchema = z.union([
  z.literal("preparing"),
  z.literal("ready"),
  z.literal("collected"),
]);
export type PosOrderStatus = z.infer<typeof PosOrderStatusSchema>;

export const UpdateOrderStatusRequestSchema = z.object({
  status: PosOrderStatusSchema,
});
export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusRequestSchema>;

export const UpdateOrderStatusResponseSchema = OrderWithItemsSchema;
export type UpdateOrderStatusResponse = OrderWithItems;

// POST /orders/:id/cancel
/** Dev spec Section 5.2's fixed staff cancellation dropdown. */
export const CancelReasonSchema = z.union([
  z.literal("item_unavailable"),
  z.literal("customer_no_show"),
  z.literal("kitchen_error"),
  z.literal("other"),
]);
export type CancelReason = z.infer<typeof CancelReasonSchema>;

/**
 * A customer cancelling their own pending order needs no reason; staff/HQ
 * cancelling requires one (dev spec Section 3). Modeled as a discriminated
 * union on `actor`.
 *
 * Split into three branches rather than `actor: "staff" | "hq"` on one
 * branch — zod's `discriminatedUnion` requires the discriminant key to be
 * a single literal per branch, not a union of literals. `staff` and `hq`
 * still carry an identical shape, so this is a mechanical difference, not
 * a semantic one.
 */
export const CancelOrderRequestSchema = z.discriminatedUnion("actor", [
  z.object({ actor: z.literal("customer") }),
  z.object({
    actor: z.literal("staff"),
    reason: CancelReasonSchema,
    otherDetail: z.string().optional(),
  }),
  z.object({
    actor: z.literal("hq"),
    reason: CancelReasonSchema,
    otherDetail: z.string().optional(),
  }),
]);
export type CancelOrderRequest = z.infer<typeof CancelOrderRequestSchema>;

export const CancelOrderResponseSchema = OrderWithItemsSchema;
export type CancelOrderResponse = OrderWithItems;
