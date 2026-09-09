/**
 * The order state machine, per docs/hey-food-developer-spec-v1.md Section 3:
 *
 *   pending -> paid -> received -> preparing -> ready -> collected -> completed
 *                                                    \-> (any pre-completed state) -> cancelled
 *
 * This is the single source of truth for order status across the backend,
 * Customer App, Outlet POS, and HQ Admin. No app should define its own copy.
 */
// A const object + derived type, not a TS `enum` — Node's native
// TypeScript support (used to run the backend without a bundler) can only
// erase pure type syntax and explicitly refuses to strip real `enum`
// declarations (they compile to actual runtime code, not just erased
// types). This is the standard enum-free pattern for that constraint:
// `OrderStatus.Pending` and `status: OrderStatus` both keep working
// exactly as before at every call site.
export const OrderStatus = {
  Pending: "pending",
  Paid: "paid",
  Received: "received",
  Preparing: "preparing",
  Ready: "ready",
  Collected: "collected",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ORDER_STATUS_VALUES: readonly OrderStatus[] = Object.values(OrderStatus);

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUS_VALUES as readonly string[]).includes(value);
}
