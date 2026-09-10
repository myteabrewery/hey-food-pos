import type { NearbyOutletsQuery, NearbyOutletsResponse, OutletDetailResponse } from "@hey-food/api-client";
import { NearbyOutletsResponseSchema, OutletDetailResponseSchema } from "@hey-food/api-client";

import { fetchJson } from "./http";

/**
 * `GET /outlets/nearby` — real backend call. Response is validated against
 * the same NearbyOutletsResponseSchema the backend validates its own
 * output against (packages/api-client), so a shape mismatch between the
 * two processes surfaces here as a thrown ZodError, not a silent bug.
 */
export async function getNearbyOutlets(query: NearbyOutletsQuery): Promise<NearbyOutletsResponse> {
  const params = `lat=${encodeURIComponent(query.lat)}&lng=${encodeURIComponent(query.lng)}`;
  return fetchJson(`/outlets/nearby?${params}`, NearbyOutletsResponseSchema);
}

/**
 * `GET /outlets/:id` — outlet detail + resolved menu (master price/
 * availability merged with any outlet override), computed server-side.
 */
export async function getOutletDetail(outletId: string): Promise<OutletDetailResponse> {
  return fetchJson(`/outlets/${encodeURIComponent(outletId)}`, OutletDetailResponseSchema);
}
