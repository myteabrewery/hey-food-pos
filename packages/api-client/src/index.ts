// Shared, typed API contract (zod schemas + inferred TS types) for Hey
// Food clients, built directly on the endpoints in
// docs/hey-food-developer-spec-v1.md Section 2.
//
// This package is a request/response CONTRACT, not an HTTP client — no
// fetch/axios wrapper, base URL, or auth-header injection lives here yet.
// That's a separate, undiscussed set of decisions.
//
// Entity types (Order, Product, Outlet, ...) are imported from
// @hey-food/shared-types directly, not re-exported here — this package
// only re-exports request/response contract types and their zod schemas,
// so there's exactly one place to import each kind of type from.
//
// GET /admin/reports is intentionally unimplemented — see admin.ts.

export * from "./common";
export * from "./entities";
export * from "./auth";
export * from "./outlets";
export * from "./menu";
export * from "./orders";
export * from "./webhooks";
export * from "./admin";
export * from "./rewards";
