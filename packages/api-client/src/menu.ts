import { z } from "zod";

import { listResponseSchema } from "./common";
import { OutletProductOverrideSchema, ProductSchema, ResolvedMenuItemSchema } from "./entities";

// GET /outlets/:id/menu
export const OutletMenuResponseSchema = listResponseSchema(ResolvedMenuItemSchema);
export type OutletMenuResponse = z.infer<typeof OutletMenuResponseSchema>;

// ---------------------------------------------------------------------------
// HQ Product / Menu Management (dev spec Section 9.3, blueprint Section 12)
// ---------------------------------------------------------------------------

/**
 * The most a menu price (master or per-outlet override) may be. A sanity guard
 * against a fat-fingered price (RM8.00 typed as 800), not a business rule: raise
 * it deliberately if a real item ever costs more.
 */
export const MAX_MENU_PRICE = 999.99;

/**
 * A price in RM: greater than 0, at most `MAX_MENU_PRICE`, at most 2 decimal
 * places. A value with more decimals is REJECTED, never rounded — HQ is told,
 * not silently given a different price than the one they typed. Shared by the
 * master price and the per-outlet override so the two can never be validated
 * differently.
 */
export const MenuPriceSchema = z
  .number({ invalid_type_error: "must be a number" })
  .finite("must be a finite number")
  .positive("must be greater than 0")
  .max(MAX_MENU_PRICE, `must be at most ${MAX_MENU_PRICE.toFixed(2)}`)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, "must have at most 2 decimal places");

const ProductNameSchema = z.string().trim().min(1, "must not be empty").max(100, "must be at most 100 characters");
const ProductDescriptionSchema = z.string().trim().max(500, "must be at most 500 characters");
const ProductCategorySchema = z.string().trim().min(1, "must not be empty").max(50, "must be at most 50 characters");
// Empty is allowed (no image); otherwise it must look like a web URL. There is no image upload yet.
const ProductImageUrlSchema = z
  .string()
  .trim()
  .max(2000, "must be at most 2000 characters")
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), "must be empty or an http(s) URL");

// POST /admin/products
/**
 * Master fields only. `.strict()`: an unknown key is an error, not silently
 * dropped. There is no `id` (the server assigns it) and no modifier groups
 * (those are still seed-only). A new product is orderable at EVERY outlet as
 * soon as it exists (no override rows = available at master price).
 * `businessId` comes from the calling session, never the client.
 */
export const CreateProductRequestSchema = z
  .object({
    name: ProductNameSchema,
    description: ProductDescriptionSchema.default(""),
    imageUrl: ProductImageUrlSchema.default(""),
    category: ProductCategorySchema,
    masterPrice: MenuPriceSchema,
  })
  .strict();
export type CreateProductRequest = z.input<typeof CreateProductRequestSchema>;

export const CreateProductResponseSchema = ProductSchema;
export type CreateProductResponse = z.infer<typeof CreateProductResponseSchema>;

// PATCH /admin/products/:id
/**
 * Edit a product's MASTER fields; only the keys sent are touched. `.strict()`
 * matters most here: it stops `id` or `businessId` being sent to move a product
 * between businesses. At least one field is required. Per-outlet data is never
 * touched by this endpoint.
 */
export const UpdateProductRequestSchema = z
  .object({
    name: ProductNameSchema.optional(),
    description: ProductDescriptionSchema.optional(),
    imageUrl: ProductImageUrlSchema.optional(),
    category: ProductCategorySchema.optional(),
    masterPrice: MenuPriceSchema.optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "send at least one field to change",
  });
export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>;

export const UpdateProductResponseSchema = ProductSchema;
export type UpdateProductResponse = z.infer<typeof UpdateProductResponseSchema>;

// PATCH /admin/outlets/:outletId/products/:productId
/**
 * HQ's outlet-level override: BOTH `isAvailable` and `priceOverride`, unlike the
 * POS endpoint below, which can only ever touch availability.
 *
 * - Keys are independent: only the ones sent change; an absent key leaves that
 *   column exactly as it is (including a value the POS set).
 * - `priceOverride: null` clears the price override back to the master price;
 *   a number sets it. `isAvailable` is not nullable.
 * - `.strict()`: any key outside { isAvailable, priceOverride } is an error, and
 *   at least one of the two is required.
 * - Rows are only ever upserted, never deleted: clearing an override to
 *   "available, no price" leaves a harmless row that means the same as no row.
 * - A price equal to the product's CURRENT master price is rejected by the
 *   server (send null instead): it would be an override that silently stops
 *   following the master the next time the master changes.
 */
export const UpdateOutletProductOverrideRequestSchema = z
  .object({
    isAvailable: z.boolean().optional(),
    priceOverride: MenuPriceSchema.nullable().optional(),
  })
  .strict()
  .refine((value) => value.isAvailable !== undefined || value.priceOverride !== undefined, {
    message: "send isAvailable and/or priceOverride",
  });
export type UpdateOutletProductOverrideRequest = z.infer<typeof UpdateOutletProductOverrideRequestSchema>;

export const UpdateOutletProductOverrideResponseSchema = OutletProductOverrideSchema;
export type UpdateOutletProductOverrideResponse = z.infer<
  typeof UpdateOutletProductOverrideResponseSchema
>;

// GET /admin/products
/** No query params: `businessId` comes from the calling session, never the client. */
export const AdminProductListQuerySchema = z.object({}).strict();
export type AdminProductListQuery = z.infer<typeof AdminProductListQuerySchema>;

/** One row of the Master Menu List: the product plus how much per-outlet variance it carries. */
export const AdminProductListItemSchema = z.object({
  product: ProductSchema,
  outletCount: z.number().int(),
  /** Outlets whose price override DIFFERS from the master price. */
  priceOverrideCount: z.number().int(),
  /** Outlets where the product is currently marked sold out. */
  unavailableOutletCount: z.number().int(),
});
export type AdminProductListItem = z.infer<typeof AdminProductListItemSchema>;

export const AdminProductListResponseSchema = listResponseSchema(AdminProductListItemSchema);
export type AdminProductListResponse = z.infer<typeof AdminProductListResponseSchema>;

// GET /admin/products/:id
/**
 * One outlet's line in the Product Detail matrix. `priceDiffersFromMaster` is
 * computed on the SERVER, in one place, next to the price-resolution logic the
 * customer menu uses, so the "differs from master" badge (dev spec 9.3, the
 * guardrail against HQ losing track of price variance) can never drift from
 * what customers are actually charged.
 */
export const AdminProductOutletRowSchema = z.object({
  outlet: z.object({ id: z.string(), name: z.string(), status: z.union([z.literal("open"), z.literal("closed")]) }),
  /** The override row, or null when this outlet has none (= available at master price). */
  override: OutletProductOverrideSchema.nullable(),
  effectiveIsAvailable: z.boolean(),
  /** What customers are charged at this outlet. */
  effectivePrice: z.number(),
  /** A price override exists AND differs from the master price. */
  priceDiffersFromMaster: z.boolean(),
});
export type AdminProductOutletRow = z.infer<typeof AdminProductOutletRowSchema>;

/**
 * An append-only record of a menu change: what changed, from what to what, when,
 * and from which surface. There is deliberately NO "who" — no authentication
 * exists to attribute it to (docs/STATUS.md: audit trail). Values are text
 * ("8.50", "true"); `null` means "no value" (e.g. no price override).
 */
export const MenuChangeEventSchema = z.object({
  id: z.string(),
  field: z.string(),
  outletId: z.string().nullable(),
  outletName: z.string().nullable(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  source: z.union([z.literal("hq"), z.literal("pos")]),
  changedAt: z.string().datetime(),
});
export type MenuChangeEvent = z.infer<typeof MenuChangeEventSchema>;

export const AdminProductDetailResponseSchema = z.object({
  product: ProductSchema,
  outlets: z.array(AdminProductOutletRowSchema),
  /** Most recent first; capped (the last 30). */
  changes: z.array(MenuChangeEventSchema),
});
export type AdminProductDetailResponse = z.infer<typeof AdminProductDetailResponseSchema>;

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
