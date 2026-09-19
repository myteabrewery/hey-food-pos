import { OutletDetailResponseSchema, type OutletDetailResponse } from "@hey-food/api-client";

import { API_BASE_URL } from "./config";

/**
 * `GET /outlets/:id` — the outlet plus its resolved menu (master menu +
 * outlet overrides already merged server-side; this app never merges
 * anything itself). Response is validated against api-client's schema, the
 * same one the backend and Customer App use.
 *
 * `cache: "no-store"` because availability changes live (staff toggle
 * sold-out at the POS) and a stale "available" here means a customer
 * customizing an item that can't be made. Returns null for an unknown
 * outlet (404) so callers can `notFound()`; any other failure throws.
 */
export async function getOutletDetail(outletId: string): Promise<OutletDetailResponse | null> {
  const response = await fetch(`${API_BASE_URL}/outlets/${encodeURIComponent(outletId)}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GET /outlets/${outletId} failed with status ${response.status}`);
  }

  return OutletDetailResponseSchema.parse(await response.json());
}
