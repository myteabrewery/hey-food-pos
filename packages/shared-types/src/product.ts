/**
 * Master menu item, defined once at brand level.
 * docs/hey-food-developer-spec-v1.md Section 1; blueprint Section 12.
 *
 * `masterPrice` (and every other monetary amount in this package) is a
 * decimal RM amount, e.g. `8.00`.
 */
export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  masterPrice: number;
}

/**
 * Per-outlet layer on top of the master menu — availability and, HQ-only,
 * price. docs/hey-food-developer-spec-v1.md Section 1; blueprint Section 12.
 *
 * `priceOverride` is a backend capability from day one but stays unexposed
 * in the outlet-facing UI for MVP (blueprint Section 12) — outlet staff can
 * only ever write `isAvailable` (dev spec Section 5.3).
 */
export interface OutletProductOverride {
  id: string;
  outletId: string;
  productId: string;
  isAvailable: boolean;
  priceOverride: number | null;
}

/**
 * Server-merged menu item — `Product` + `OutletProductOverride` already
 * resolved into one flat shape. Backs `GET /outlets/:id` and
 * `GET /outlets/:id/menu`; the client never merges master menu and outlet
 * overrides itself (dev spec Section 4.2 — avoids stale-cache mismatches).
 */
export interface ResolvedMenuItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  /** Either the product's `masterPrice` or the outlet's `priceOverride`, already resolved. */
  price: number;
  isAvailable: boolean;
  modifierGroups: Array<ProductModifierGroup & { options: ProductModifierOption[] }>;
}

/**
 * A named group of customization options for a product (e.g. "Spice
 * Level", "Add-ons", "Remove"). docs/product-customization-v2.md
 * (supersedes v1's `required: boolean` — see that doc's migration
 * table for how old values map onto `minSelections`/`maxSelections`).
 *
 * `minSelections`/`maxSelections` count **distinct options selected**,
 * not total quantity — picking "2x Fish Balls" is 1 selection toward
 * these bounds; `ProductModifierOption.quantityEnabled` governs the
 * "how much of this one" axis instead. `minSelections: 0` is optional;
 * `maxSelections: null` means no upper bound.
 */
export interface ProductModifierGroup {
  id: string;
  productId: string;
  name: string;
  selectionType: "single" | "multiple";
  minSelections: number;
  maxSelections: number | null;
  sortOrder: number;
}

/**
 * One selectable option within a `ProductModifierGroup`.
 * docs/product-customization-v2.md.
 *
 * `priceDelta` is a decimal RM amount added to the item's price if this
 * option is selected — 0 for free options (e.g. "No Vegetables") — and
 * is multiplied by the selection's `quantity` (OrderItemModifier) when
 * `quantityEnabled` is true.
 */
export interface ProductModifierOption {
  id: string;
  groupId: string;
  name: string;
  priceDelta: number;
  /** If true, the UI offers a quantity stepper once selected (e.g. "2x Fish Balls"); if false, it's a plain on/off pick. */
  quantityEnabled: boolean;
  sortOrder: number;
  /** Nullable — real photos are added gradually per-option, not required on day one. */
  imageUrl: string | null;
}
