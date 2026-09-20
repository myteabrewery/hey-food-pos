import type { OrderWithItems } from "@hey-food/api-client";
import { ApiErrorSchema, PosQueueResponseSchema } from "@hey-food/api-client";

import { API_BASE_URL, POS_DEVICE_KEY } from "../config";

export class QueueFetchError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when nothing came back (offline / server down / timeout). */
    readonly status: number,
  ) {
    super(message);
    this.name = "QueueFetchError";
  }
}

const REQUEST_TIMEOUT_MS = 8_000;

/**
 * `GET /pos/outlets/:outletId/orders` — the outlet's live queue (paid and not
 * yet collected/cancelled). READ-ONLY: staff actions are still local-only
 * (see useLiveOrders). Sends the TEMPORARY shared device key (see config.ts).
 */
export async function fetchQueue(outletId: string): Promise<OrderWithItems[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/pos/outlets/${encodeURIComponent(outletId)}/orders`, {
      headers: { "X-Pos-Device-Key": POS_DEVICE_KEY },
      signal: controller.signal,
    });
  } catch {
    throw new QueueFetchError("Can't reach the server.", 0);
  } finally {
    clearTimeout(timeout);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(body);
    throw new QueueFetchError(
      parsed.success ? parsed.data.error.message : `Server error (${response.status}).`,
      response.status,
    );
  }

  return PosQueueResponseSchema.parse(body).data;
}
