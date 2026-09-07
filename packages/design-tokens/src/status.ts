/**
 * Order status colors are NOT redefined here — they're owned by
 * @hey-food/shared-types (the same package the backend and every app use
 * for the OrderStatus enum itself), so a status can never visually diverge
 * from the enum it represents. Re-exported from here purely so consumers
 * of the design-tokens package have one place to import all tokens from.
 *
 * See docs/hey-food-design-system-v1.md Section 2.
 */
export { OrderStatus, ORDER_STATUS_META, isOrderStatus } from "@hey-food/shared-types";
export type { StatusMeta } from "@hey-food/shared-types";
