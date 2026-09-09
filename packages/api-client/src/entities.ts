import { z } from "zod";
import type {
  Customer,
  DayHours,
  OperatingHours,
  Order,
  OrderItem,
  OrderItemModifier,
  Outlet,
  OutletProductOverride,
  Product,
  ProductModifierGroup,
  ProductModifierOption,
  ResolvedMenuItem,
  StaffUser,
} from "@hey-food/shared-types";
import { OrderStatus } from "@hey-food/shared-types";

// Zod schemas for the shared-types entities actually referenced by at
// least one endpoint contract in this package. Each is checked against its
// shared-types interface via `satisfies`, so a field renamed or retyped in
// shared-types surfaces here as a compile error instead of silent drift.
//
// Business, POSDevice, Payment, and NotificationLog have no schema here —
// no endpoint below returns any of them directly yet. Add one when an
// endpoint actually needs it, rather than speculatively ahead of that.

export const OrderStatusSchema = z.nativeEnum(OrderStatus);

export const OutletStatusSchema = z.union([z.literal("open"), z.literal("closed")]);

export const DayHoursSchema = z.object({
  open: z.string(),
  close: z.string(),
  closed: z.boolean().optional(),
}) satisfies z.ZodType<DayHours>;

export const OperatingHoursSchema = z.object({
  mon: DayHoursSchema,
  tue: DayHoursSchema,
  wed: DayHoursSchema,
  thu: DayHoursSchema,
  fri: DayHoursSchema,
  sat: DayHoursSchema,
  sun: DayHoursSchema,
}) satisfies z.ZodType<OperatingHours>;

export const OutletSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  geofenceRadiusM: z.number(),
  operatingHours: OperatingHoursSchema,
  status: OutletStatusSchema,
  createdAt: z.string().datetime(),
}) satisfies z.ZodType<Outlet>;

export const StaffRoleSchema = z.union([
  z.literal("hq_admin"),
  z.literal("area_manager"),
  z.literal("outlet_staff"),
]);

export const StaffUserSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string(),
  phone: z.string(),
  role: StaffRoleSchema,
  assignedOutletIds: z.array(z.string()),
  pinHash: z.string(),
}) satisfies z.ZodType<StaffUser>;

/**
 * `pinHash` is a hashed credential and must never leave the backend in an
 * API response. Every endpoint that returns "the staff record" (e.g. staff
 * login) uses this instead of `StaffUserSchema` directly.
 */
export const PublicStaffUserSchema = StaffUserSchema.omit({ pinHash: true });
export type PublicStaffUser = z.infer<typeof PublicStaffUserSchema>;

export const CustomerSchema = z.object({
  id: z.string(),
  phone: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
  loyaltyPoints: z.number(),
}) satisfies z.ZodType<Customer>;

export const ProductSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  category: z.string(),
  masterPrice: z.number(),
}) satisfies z.ZodType<Product>;

export const OutletProductOverrideSchema = z.object({
  id: z.string(),
  outletId: z.string(),
  productId: z.string(),
  isAvailable: z.boolean(),
  priceOverride: z.number().nullable(),
}) satisfies z.ZodType<OutletProductOverride>;

/** docs/product-customization-v1.md. */
export const ProductModifierGroupSchema = z.object({
  id: z.string(),
  productId: z.string(),
  selectionType: z.union([z.literal("single"), z.literal("multiple")]),
  name: z.string(),
  required: z.boolean(),
  sortOrder: z.number(),
}) satisfies z.ZodType<ProductModifierGroup>;

/** docs/product-customization-v1.md. */
export const ProductModifierOptionSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  priceDelta: z.number(),
  sortOrder: z.number(),
}) satisfies z.ZodType<ProductModifierOption>;

export const ResolvedMenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  category: z.string(),
  price: z.number(),
  isAvailable: z.boolean(),
  modifierGroups: z.array(
    ProductModifierGroupSchema.extend({
      options: z.array(ProductModifierOptionSchema),
    }),
  ),
}) satisfies z.ZodType<ResolvedMenuItem>;

/** docs/product-customization-v1.md. */
export const OrderItemModifierSchema = z.object({
  id: z.string(),
  orderItemId: z.string(),
  groupNameSnapshot: z.string(),
  optionNameSnapshot: z.string(),
  priceDeltaSnapshot: z.number(),
}) satisfies z.ZodType<OrderItemModifier>;

export const OrderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  nameSnapshot: z.string(),
  priceSnapshot: z.number(),
  quantity: z.number(),
  notes: z.string().nullable(),
  modifiers: z.array(OrderItemModifierSchema),
}) satisfies z.ZodType<OrderItem>;

export const OrderSchema = z.object({
  id: z.string(),
  outletId: z.string(),
  customerId: z.string(),
  displayId: z.string(),
  status: OrderStatusSchema,
  subtotal: z.number(),
  serviceFee: z.number(),
  total: z.number(),
  paymentId: z.string().nullable(),
  createdAt: z.string().datetime(),
  paidAt: z.string().datetime().nullable(),
  receivedAt: z.string().datetime().nullable(),
  preparingAt: z.string().datetime().nullable(),
  readyAt: z.string().datetime().nullable(),
  notifiedAt: z.string().datetime().nullable(),
  collectedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  cancelReason: z.string().nullable(),
}) satisfies z.ZodType<Order>;
