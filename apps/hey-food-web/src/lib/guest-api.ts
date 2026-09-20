import {
  ApiErrorSchema,
  CreateGuestOrderResponseSchema,
  OrderDetailResponseSchema,
  PayOrderResponseSchema,
  type CreateGuestOrderRequest,
  type CreateGuestOrderResponse,
  type OrderDetailResponse,
  type PayOrderResponse,
} from "@hey-food/api-client";

import { PUBLIC_API_BASE_URL } from "./config";

/** A failed backend call, carrying the API's own `{ error: { code, message } }`. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function request(path: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${PUBLIC_API_BASE_URL}${path}`, { ...init, cache: "no-store" });
  } catch {
    // fetch only rejects when nothing came back (offline, server down, CORS).
    throw new ApiRequestError(0, "NETWORK_ERROR", "Couldn't reach the server. Check your connection and try again.");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(body);
    throw new ApiRequestError(
      response.status,
      parsed.success ? parsed.data.error.code : "HTTP_ERROR",
      parsed.success ? parsed.data.error.message : `Something went wrong (${response.status}).`,
    );
  }
  return body;
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/**
 * `POST /guest/orders`. `idempotencyKey` makes a retry of the SAME request
 * (lost response, flaky network) return the same order instead of a second
 * one — see `Order.idempotencyKey` in the backend. The response carries the
 * order's `guestToken`, shown once: the caller must store it.
 */
export async function createGuestOrder(
  body: CreateGuestOrderRequest,
  idempotencyKey: string,
): Promise<CreateGuestOrderResponse> {
  return CreateGuestOrderResponseSchema.parse(
    await request("/guest/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    }),
  );
}

/** `GET /orders/:id`, authorized by the order's guest token. */
export async function getGuestOrder(orderId: string, token: string): Promise<OrderDetailResponse> {
  return OrderDetailResponseSchema.parse(
    await request(`/orders/${encodeURIComponent(orderId)}`, { method: "GET", headers: bearer(token) }),
  );
}

/** `POST /orders/:id/pay` — today the backend's payment STUB (see `isStub`). */
export async function payGuestOrder(orderId: string, token: string): Promise<PayOrderResponse> {
  return PayOrderResponseSchema.parse(
    await request(`/orders/${encodeURIComponent(orderId)}/pay`, { method: "POST", headers: bearer(token) }),
  );
}
