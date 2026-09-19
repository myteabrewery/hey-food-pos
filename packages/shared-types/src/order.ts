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
 *
 * `customerId` is null for a guest (web-checkout) order — one placed with
 * just a phone number, no account. That's the whole discriminator: null
 * means guest, set means app-based; the DB's `orders_identity_xor` CHECK
 * guarantees exactly one holds. The guest's phone (`guestPhone`) and the
 * hash of their ownership token (`guestTokenHash`) live on the DB row only
 * and are deliberately not part of this shared shape — the hash must never
 * leave the server, and nothing outside the (not yet built) notification
 * service needs the phone.
 */
export interface Order {
  id: string;
  outletId: string;
  customerId: string | null;
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
  /**
   * Why the order was cancelled — ALWAYS one of the clean, fixed reason
   * values (dev spec Section 5.2: `item_unavailable` | `customer_no_show` |
   * `kitchen_error` | `other`), never composed free text, so cancellations
   * stay directly groupable for HQ reporting. Null unless cancelled (and for
   * a customer's own pre-payment cancel, which needs no reason).
   */
  cancelReason: string | null;
  /**
   * The staff member's free-text explanation, populated ONLY when
   * `cancelReason` is `other` (and only if they typed one) — null in every
   * other case. Kept as its own field, not folded into `cancelReason`, for the
   * same reason `OrderItemModifier` keeps `groupNameSnapshot` and
   * `optionNameSnapshot` separate instead of concatenating them.
   */
  cancelReasonDetail: string | null;
}

/**
 * docs/hey-food-developer-spec-v1.md Section 1.
 *
 * `nameSnapshot` / `priceSnapshot` preserve exactly what the customer was
 * charged, independent of later edits to the master `Product` record.
 * `modifiers` is the same idea one level down — see `OrderItemModifier`.
 */
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  notes: string | null;
  modifiers: OrderItemModifier[];
}

/**
 * Snapshot of one selected modifier option on an `OrderItem` — same
 * pattern as `OrderItem`'s own `nameSnapshot`/`priceSnapshot`: preserves
 * exactly what was selected and charged, independent of later edits to
 * the product's live modifier groups/options. docs/product-
 * customization-v2.md.
 *
 * `quantity` defaults to 1 for options where `ProductModifierOption.
 * quantityEnabled` is false (a plain on/off pick still has a quantity of
 * exactly one). This modifier's contribution to the order total is
 * `priceDeltaSnapshot * quantity`.
 */
export interface OrderItemModifier {
  id: string;
  orderItemId: string;
  groupNameSnapshot: string;
  optionNameSnapshot: string;
  priceDeltaSnapshot: number;
  quantity: number;
}
