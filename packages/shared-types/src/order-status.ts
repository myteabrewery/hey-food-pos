/**
 * The order state machine, per docs/hey-food-developer-spec-v1.md Section 3:
 *
 *   pending -> paid -> received -> preparing -> ready -> collected -> completed
 *                                                    \-> (any pre-completed state) -> cancelled
 *
 * This is the single source of truth for order status across the backend,
 * Customer App, Outlet POS, and HQ Admin. No app should define its own copy.
 */
export enum OrderStatus {
  Pending = "pending",
  Paid = "paid",
  Received = "received",
  Preparing = "preparing",
  Ready = "ready",
  Collected = "collected",
  Completed = "completed",
  Cancelled = "cancelled",
}

export const ORDER_STATUS_VALUES: readonly OrderStatus[] = Object.values(OrderStatus);

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUS_VALUES as readonly string[]).includes(value);
}
