import type { CreateOrderRequest } from "@hey-food/api-client";
import { CreateOrderRequestSchema } from "@hey-food/api-client";

/**
 * Stub for `POST /orders` — no real network call, no payment flow, no
 * post-submit navigation yet. Validates the request against the real
 * schema (proving the shape is correct ahead of the backend existing) and
 * logs it, same pattern as the other api/ stubs.
 */
export async function createOrder(request: CreateOrderRequest): Promise<void> {
  const validated = CreateOrderRequestSchema.parse(request);
  console.log("POST /orders (stub) ->", JSON.stringify(validated, null, 2));
}
