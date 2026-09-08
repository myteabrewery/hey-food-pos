import type { NearbyOutletsQuery, NearbyOutletsResponse } from "@hey-food/api-client";
import { NearbyOutletsResponseSchema } from "@hey-food/api-client";

/**
 * Stub for `GET /outlets/nearby` — the backend has no real implementation
 * yet. Returns mock data validated against the real response schema at
 * runtime, so this proves the contract chain (shared-types -> api-client ->
 * this app) end to end rather than just compiling against `any`.
 *
 * Replace the body with a real fetch() call once the backend exists — the
 * function signature is already the real contract, so nothing calling this
 * needs to change.
 */
export async function getNearbyOutlets(
  _query: NearbyOutletsQuery,
): Promise<NearbyOutletsResponse> {
  const mockResponse: NearbyOutletsResponse = {
    data: [
      {
        id: "outlet_paradigm_mall",
        businessId: "biz_hey_food",
        name: "Hey Food — Paradigm Mall",
        address: "1 Utama Shopping Centre, Petaling Jaya",
        lat: 3.1499,
        lng: 101.6122,
        geofenceRadiusM: 100,
        operatingHours: {
          mon: { open: "10:00", close: "22:00" },
          tue: { open: "10:00", close: "22:00" },
          wed: { open: "10:00", close: "22:00" },
          thu: { open: "10:00", close: "22:00" },
          fri: { open: "10:00", close: "22:00" },
          sat: { open: "10:00", close: "22:00" },
          sun: { open: "10:00", close: "22:00" },
        },
        status: "open",
        createdAt: new Date().toISOString(),
        distanceM: 240,
      },
    ],
  };

  return NearbyOutletsResponseSchema.parse(mockResponse);
}
