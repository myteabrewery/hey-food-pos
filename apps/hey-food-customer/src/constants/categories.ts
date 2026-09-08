/**
 * Placeholder category set, per docs/customer-app-screens-v1.md: "no
 * defined taxonomy beyond the four shown (Rice, Noodles, Chicken,
 * Drinks)". Shared by Home's CategoryShortcuts and Menu's CategoryPills so
 * the two can't independently drift from each other (or from the doc) the
 * way they previously did before this file existed.
 *
 * Dev spec doesn't define a category taxonomy independent of a specific
 * outlet's menu (categories live on `Product`, scoped per outlet) — this
 * remains presentational only until there's a real source for "categories
 * across all outlets."
 */
export const PLACEHOLDER_CATEGORIES = ["Rice", "Noodles", "Chicken", "Drinks"] as const;
