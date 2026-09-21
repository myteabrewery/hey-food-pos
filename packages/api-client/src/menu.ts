import { z } from "zod";

import { listResponseSchema } from "./common";
import { OutletProductOverrideSchema, ProductSchema, ResolvedMenuItemSchema } from "./entities";

// GET /outlets/:id/menu
export const OutletMenuResponseSchema = listResponseSchema(ResolvedMenuItemSchema);
export type OutletMenuResponse = z.infer<typeof OutletMenuResponseSchema>;

// PATCH /admin/products/:id
export const UpdateProductRequestSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
  masterPrice: z.number().optional(),
});
export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>;

export const UpdateProductResponseSchema = ProductSchema;
export type UpdateProductResponse = z.infer<typeof UpdateProductResponseSchema>;

// PATCH /admin/outlets/:id/products/:productId
/** HQ can touch both fields, per blueprint Section 12's price-override scope. */
export const UpdateOutletProductOverrideRequestSchema = z.object({
  isAvailable: z.boolean().optional(),
  priceOverride: z.number().nullable().optional(),
});
export type UpdateOutletProductOverrideRequest = z.infer<
  typeof UpdateOutletProductOverrideRequestSchema
>;

export const UpdateOutletProductOverrideResponseSchema = OutletProductOverrideSchema;
export type UpdateOutletProductOverrideResponse = z.infer<
  typeof UpdateOutletProductOverrideResponseSchema
>;

// PATCH /pos/outlets/:id/products/:productId/availability
/**
 * Availability only — `priceOverride` cannot even be constructed in this
 * request's type, enforcing dev spec Section 5.3's role restriction
 * (outlet staff can toggle availability, never price) at the type level.
 *
 * `isAvailable` is the DESIRED state, not a flip: sending the same value
 * twice is a no-op, so a retry after a lost response, or two staff tapping at
 * once, can never leave a product in the state nobody asked for.
 *
 * `.strict()` so the restriction also holds at RUNTIME: a plain `z.object`
 * silently drops unknown keys, which would let `{ isAvailable, priceOverride }`
 * succeed with the price quietly ignored. Any extra key is a validation error
 * instead — a client attempting to send a price is told, not ignored.
 */
export const UpdateProductAvailabilityRequestSchema = z
  .object({
    isAvailable: z.boolean(),
  })
  .strict();
export type UpdateProductAvailabilityRequest = z.infer<
  typeof UpdateProductAvailabilityRequestSchema
>;

export const UpdateProductAvailabilityResponseSchema = OutletProductOverrideSchema;
export type UpdateProductAvailabilityResponse = z.infer<
  typeof UpdateProductAvailabilityResponseSchema
>;
