import type { OutletProductOverride } from "@hey-food/shared-types";
import {
  OutletDetailResponseSchema,
  UpdateProductAvailabilityRequestSchema,
  UpdateProductAvailabilityResponseSchema,
} from "@hey-food/api-client";

import { posRequest } from "./http";

/**
 * What Menu Availability needs of a product at THIS outlet: its name and
 * category, the price customers are actually charged here (master price or the
 * outlet's HQ override), and whether it can be ordered right now.
 */
export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
}

/**
 * `GET /outlets/:id` — the same resolved menu customers and guests are served
 * (master price + outlet override, availability merged server-side), so what
 * staff toggle here is exactly what customers see. PUBLIC endpoint: no device
 * key is sent. The response also carries modifier groups, which this screen
 * ignores.
 */
export async function fetchMenu(outletId: string): Promise<MenuItem[]> {
  const detail = OutletDetailResponseSchema.parse(
    await posRequest("GET", `/outlets/${encodeURIComponent(outletId)}`, undefined, { withDeviceKey: false }),
  );
  return detail.menu.map(({ id, name, category, price, isAvailable }) => ({ id, name, category, price, isAvailable }));
}

/**
 * `PATCH /pos/outlets/:outletId/products/:productId/availability` — sets the
 * DESIRED state (not a flip), so a repeat is a no-op. The body is exactly
 * `{ isAvailable }`: the request schema is strict and has no price field, so a
 * price cannot be sent from here even by mistake (dev spec Section 5.3). Sends
 * the TEMPORARY shared device key. Returns the outlet-product override row.
 */
export async function setProductAvailability(
  outletId: string,
  productId: string,
  isAvailable: boolean,
): Promise<OutletProductOverride> {
  const body = UpdateProductAvailabilityRequestSchema.parse({ isAvailable });
  return UpdateProductAvailabilityResponseSchema.parse(
    await posRequest(
      "PATCH",
      `/pos/outlets/${encodeURIComponent(outletId)}/products/${encodeURIComponent(productId)}/availability`,
      body,
    ),
  );
}
