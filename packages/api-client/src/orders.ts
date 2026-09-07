import { z } from "zod";

import { OrderItemSchema, OrderSchema } from "./entities";

/**
 * `Order` + embedded `items`, per cross-cutting decision #2 — every order
 * response nests items inline rather than requiring a separate call.
 */
export const OrderWithItemsSchema = OrderSchema.extend({
  items: z.array(OrderItemSchema),
});
export type OrderWithItems = z.infer<typeof OrderWithItemsSchema>;

// POST /orders
export const CreateOrderItemInputSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
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

// POST /orders/:id/pay
export const PayOrderResponseSchema = z.object({
  redirectUrl: z.string(),
});
export type PayOrderResponse = z.infer<typeof PayOrderResponseSchema>;

// GET /orders/:id
export const OrderDetailResponseSchema = OrderWithItemsSchema;
export type OrderDetailResponse = OrderWithItems;

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
