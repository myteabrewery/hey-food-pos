import type { OrderWithItems, PosOrderStatus } from "@hey-food/api-client";
import { CancelOrderResponseSchema, UpdateOrderStatusResponseSchema } from "@hey-food/api-client";

import type { StaffCancelRequest } from "../orders/transitions";
import { posRequest } from "./http";

/**
 * `PATCH /pos/orders/:id/status` — Start / Ready / Collect. The server
 * enforces the state machine (409 for a skipped or invalid transition) and
 * returns the order as it now stands, which the caller adopts over its
 * optimistic guess.
 */
export async function patchOrderStatus(orderId: string, status: PosOrderStatus): Promise<OrderWithItems> {
  return UpdateOrderStatusResponseSchema.parse(
    await posRequest("PATCH", `/pos/orders/${encodeURIComponent(orderId)}/status`, { status }),
  );
}

/** `POST /pos/orders/:id/cancel` — staff cancel: a typed reason, detail only for "other". */
export async function postCancelOrder(orderId: string, request: StaffCancelRequest): Promise<OrderWithItems> {
  return CancelOrderResponseSchema.parse(
    await posRequest("POST", `/pos/orders/${encodeURIComponent(orderId)}/cancel`, request),
  );
}
