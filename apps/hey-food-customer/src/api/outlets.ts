import type { NearbyOutletsQuery, NearbyOutletsResponse, OutletDetailResponse } from "@hey-food/api-client";
import { NearbyOutletsResponseSchema, OutletDetailResponseSchema } from "@hey-food/api-client";
import type { Outlet } from "@hey-food/shared-types";

// Flip to "closed" locally to preview OutletCard's closed-state treatment
// (reduced card opacity, disabled "Order Now") — there's no dev menu/
// storybook yet to switch this via UI, so this is the wiring point. Both
// branches are real, typed data, not just a type-level possibility:
// OutletCard's conditional rendering genuinely runs off whichever value
// this holds.
const MOCK_OUTLET_STATUS: Outlet["status"] = "open";

// Shared across getNearbyOutlets and getOutletDetail below so both stubs
// describe the same outlet, rather than two mock objects that could drift
// from each other.
const MOCK_OUTLET: Outlet = {
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
  status: MOCK_OUTLET_STATUS,
  createdAt: new Date().toISOString(),
};

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
    data: [{ ...MOCK_OUTLET, distanceM: 240 }],
  };

  return NearbyOutletsResponseSchema.parse(mockResponse);
}

/**
 * Stub for `GET /outlets/:id` — outlet detail + resolved menu in one call.
 * This is what Menu screen fetches from, given only an `outletId` route
 * param: Expo Router params are plain strings (no way to carry a full
 * NearbyOutlet object through a URL-shaped route), and a QR-code deep link
 * to a specific outlet (blueprint's geofencing/Location Service section)
 * will only ever carry an ID too — so the destination screen has to be
 * able to load everything it needs from just that ID regardless.
 *
 * Includes one unavailable item (Fried Chicken) so the sold-out row
 * treatment is actually exercised by this stub, not just theoretically
 * supported by the type.
 */
export async function getOutletDetail(_outletId: string): Promise<OutletDetailResponse> {
  const mockResponse: OutletDetailResponse = {
    outlet: MOCK_OUTLET,
    menu: [
      {
        id: "prod_chicken_rice",
        name: "Chicken Rice",
        description: "Steamed chicken, fragrant rice, chili sauce.",
        imageUrl: "",
        category: "Rice",
        price: 8.0,
        isAvailable: true,
      },
      {
        id: "prod_fried_noodles",
        name: "Fried Noodles",
        description: "Wok-fried noodles with vegetables and egg.",
        imageUrl: "",
        category: "Noodles",
        price: 7.5,
        isAvailable: true,
      },
      {
        id: "prod_fried_chicken",
        name: "Fried Chicken (2pc)",
        description: "Crispy fried chicken, two pieces.",
        imageUrl: "",
        category: "Chicken",
        price: 9.0,
        isAvailable: false,
      },
      {
        id: "prod_iced_tea",
        name: "Iced Tea",
        description: "Sweetened iced tea.",
        imageUrl: "",
        category: "Drinks",
        price: 3.0,
        isAvailable: true,
      },
    ],
  };

  return OutletDetailResponseSchema.parse(mockResponse);
}
