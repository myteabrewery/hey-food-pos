import type { CancelOrderRequest, CancelReason, OrderWithItems, PosOrderStatus } from "@hey-food/api-client";
import { CancelOrderRequestSchema } from "@hey-food/api-client";
import { OrderStatus } from "@hey-food/shared-types";

// The CLIENT-SIDE MIRROR of PATCH /pos/orders/:id/status and POST
// /pos/orders/:id/cancel. useLiveOrders applies these OPTIMISTICALLY the
// instant staff tap, then replaces the result with the server's authoritative
// copy (or rolls it back if the save fails); mock mode uses them as the whole
// truth. They stamp what the server stamps (dev spec Section 3) so the card
// looks right before the response arrives. One place, shared by the queue
// cards and the order detail screen.
// One deliberate difference: the server turns a Collect into `completed`
// (collected -> completed is automatic); here it stays `collected`, which the
// queue treats identically — it leaves the active columns either way.

export interface PrimaryAction {
  /** Wording on the compact queue card's button. */
  queueLabel: string;
  /** Wording on the order detail screen's button. */
  detailLabel: string;
  nextStatus: PosOrderStatus;
}

/**
 * The single primary staff action for each active status. `detailLabel`
 * differs from `queueLabel` in exactly one place: dev spec Section 5.2 names
 * the Preparing -> Ready action "Mark ready & call customer" on the detail
 * screen ("a single combined action, not two steps"), while the compact
 * queue card has always said just "Ready". Same transition either way.
 */
const PRIMARY_ACTION_BY_STATUS: Partial<Record<OrderStatus, PrimaryAction>> = {
  [OrderStatus.Received]: { queueLabel: "Start", detailLabel: "Start", nextStatus: "preparing" },
  [OrderStatus.Preparing]: {
    queueLabel: "Ready",
    detailLabel: "Mark Ready & Call Customer",
    nextStatus: "ready",
  },
  [OrderStatus.Ready]: { queueLabel: "Collect", detailLabel: "Collect", nextStatus: "collected" },
};

/** null for a status with no staff action (pending, collected, cancelled, ...). */
export function primaryActionFor(status: OrderStatus): PrimaryAction | null {
  return PRIMARY_ACTION_BY_STATUS[status] ?? null;
}

// Maps each PosOrderStatus transition to the Order timestamp field it sets.
const TIMESTAMP_FIELD_BY_STATUS: Record<PosOrderStatus, "preparingAt" | "readyAt" | "collectedAt"> = {
  preparing: "preparingAt",
  ready: "readyAt",
  collected: "collectedAt",
};

export function advanceOrder(order: OrderWithItems, nextStatus: PosOrderStatus, now: string): OrderWithItems {
  return { ...order, status: nextStatus, [TIMESTAMP_FIELD_BY_STATUS[nextStatus]]: now };
}

/** The staff branch of api-client's CancelOrderRequest union (POS never sends the customer/hq branches). */
export type StaffCancelRequest = Extract<CancelOrderRequest, { actor: "staff" }>;

/** Dev spec Section 5.2's fixed dropdown, in the order it lists them. */
export const CANCEL_REASON_OPTIONS: ReadonlyArray<{ value: CancelReason; label: string }> = [
  { value: "item_unavailable", label: "Item unavailable" },
  { value: "customer_no_show", label: "Customer no-show" },
  { value: "kitchen_error", label: "Kitchen error" },
  { value: "other", label: "Other" },
];

/**
 * Validates the request against the real api-client schema (so the shape is
 * proven correct ahead of the endpoint existing — same pattern as
 * mock/orders.ts), then applies it locally.
 *
 * The request's `reason` and `otherDetail` map one-to-one onto the Order's
 * separate `cancelReason` (always the clean enum value) and
 * `cancelReasonDetail` (only for `other`, and only if text was typed; null
 * otherwise) — nothing is composed into a single string, so cancellations
 * stay groupable by reason. A stray `otherDetail` sent with any other reason
 * is dropped rather than stored, keeping "detail only for other" true.
 */
export function cancelOrder(order: OrderWithItems, request: StaffCancelRequest, now: string): OrderWithItems {
  const parsed = CancelOrderRequestSchema.parse(request);
  if (parsed.actor !== "staff") {
    throw new Error("POS can only send staff cancellations");
  }

  // Blank or whitespace-only text counts as "no detail" (null), so reporting
  // never has to treat "" and null as two kinds of nothing.
  const detail = parsed.reason === "other" ? parsed.otherDetail?.trim() : undefined;

  return {
    ...order,
    status: OrderStatus.Cancelled,
    cancelledAt: now,
    cancelReason: parsed.reason,
    cancelReasonDetail: detail ? detail : null,
  };
}
