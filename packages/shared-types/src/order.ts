import type { ISODateString } from "./common";
import type { OrderStatus } from "./order-status";

/**
 * docs/hey-food-developer-spec-v1.md Section 1.
 *
 * Every `*At` field is null until its corresponding OrderStatus transition
 * happens (dev spec Section 3) — `receivedAt` in particular is what lets
 * HQ distinguish "customer paid" from "outlet's tablet actually has it"
 * (blueprint Section 7).
 *
 * `displayId` (e.g. "PM238") is the outlet-prefixed, human-readable ID for
 * staff/customers. It is a separate field from `id` on purpose — `id` is
 * never exposed in any UI (dev spec Section 1).
 */
export interface Order {
  id: string;
  outletId: string;
  customerId: string;
  displayId: string;
  status: OrderStatus;
  subtotal: number;
  serviceFee: number;
  total: number;
  paymentId: string | null;
  createdAt: ISODateString;
  paidAt: ISODateString | null;
  receivedAt: ISODateString | null;
  preparingAt: ISODateString | null;
  readyAt: ISODateString | null;
  notifiedAt: ISODateString | null;
  collectedAt: ISODateString | null;
  completedAt: ISODateString | null;
  cancelledAt: ISODateString | null;
  cancelReason: string | null;
}

/**
 * docs/hey-food-developer-spec-v1.md Section 1.
 *
 * `nameSnapshot` / `priceSnapshot` preserve exactly what the customer was
 * charged, independent of later edits to the master `Product` record.
 */
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  notes: string | null;
}
