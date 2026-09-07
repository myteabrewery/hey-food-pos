// Shared TypeScript types for Hey Food — order status, entity types, and
// the shared status→color/label map. Framework-free: no Prisma, no React,
// no runtime dependencies. This is the single source of truth every app
// (Customer App, Outlet POS, HQ Admin, Backend) imports so the order state
// machine and status model stay identical everywhere.
//
// See docs/hey-food-developer-spec-v1.md Section 1 (data model) & Section 3
// (order state machine), and docs/hey-food-design-system-v1.md Section 2
// (status colors).

export * from "./common";
export * from "./order-status";
export * from "./status-meta";
export * from "./business";
export * from "./outlet";
export * from "./pos-device";
export * from "./staff-user";
export * from "./customer";
export * from "./product";
export * from "./order";
export * from "./payment";
export * from "./notification-log";
