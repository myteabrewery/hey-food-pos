import type { OrderWithItems } from "@hey-food/api-client";
import { PosQueueResponseSchema } from "@hey-food/api-client";

import { posRequest } from "./http";

/**
 * `GET /pos/outlets/:outletId/orders` — the outlet's live queue. Fetching it
 * is also the POS "sync" that moves a freshly paid order to `received` (dev
 * spec Section 3), so the orders come back already in the New column.
 */
export async function fetchQueue(outletId: string): Promise<OrderWithItems[]> {
  return PosQueueResponseSchema.parse(await posRequest("GET", `/pos/outlets/${encodeURIComponent(outletId)}/orders`)).data;
}
