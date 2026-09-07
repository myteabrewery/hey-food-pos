import { z } from "zod";

import { listResponseSchema } from "./common";
import { OutletSchema, ResolvedMenuItemSchema } from "./entities";

// GET /outlets/nearby?lat=&lng=
export const NearbyOutletsQuerySchema = z.object({
  lat: z.number(),
  lng: z.number(),
});
export type NearbyOutletsQuery = z.infer<typeof NearbyOutletsQuerySchema>;

const NearbyOutletSchema = OutletSchema.extend({
  distanceM: z.number(),
});

export const NearbyOutletsResponseSchema = listResponseSchema(NearbyOutletSchema);
export type NearbyOutletsResponse = z.infer<typeof NearbyOutletsResponseSchema>;

// GET /outlets/:id
/**
 * The nested `menu` array is not itself wrapped in `{ data }` — the
 * `{ data }` convention (cross-cutting decision #1) applies to a top-level
 * response body that IS a collection, not to a named array field inside a
 * composite object.
 */
export const OutletDetailResponseSchema = z.object({
  outlet: OutletSchema,
  menu: z.array(ResolvedMenuItemSchema),
});
export type OutletDetailResponse = z.infer<typeof OutletDetailResponseSchema>;
