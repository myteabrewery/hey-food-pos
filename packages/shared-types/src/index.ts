// Shared TypeScript types for Hey Food — order status, entity types, and
// the shared status→color/label map. Framework-free: no Prisma, no React,
// no runtime dependencies. This is the single source of truth every app
// (Customer App, Outlet POS, HQ Admin, Backend) imports so the order state
// machine and status model stay identical everywhere.
//
// See docs/hey-food-developer-spec-v1.md Section 1 (data model) & Section 3
// (order state machine), and docs/hey-food-design-system-v1.md Section 2
// (status colors).

// Everything below is a pure-type module (interfaces/type aliases, no
// runtime values) EXCEPT order-status and status-meta, which export a real
// `enum` and a real lookup `const` respectively and so stay real (not
// type-only) exports.
export type * from "./common";
export * from "./order-status";
export * from "./status-meta";
export type * from "./business";
export type * from "./outlet";
export type * from "./pos-device";
export type * from "./staff-user";
export type * from "./customer";
export type * from "./product";
export type * from "./order";
export type * from "./payment";
export type * from "./notification-log";
