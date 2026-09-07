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
