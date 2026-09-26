import { HttpStatus, type Logger } from "@nestjs/common";
import { MAX_CANCEL_DETAIL_LENGTH, type CancelReason } from "@hey-food/api-client";
import type { CancelSource } from "@prisma/client";

import { ApiException } from "../common/api-exception";
import { PrismaService } from "../prisma/prisma.service";
import { orderInclude, type OrderWithItemsRow } from "./order.mapper";

export interface CancelOrderInput {
  reason: CancelReason;
  /** Free text; only kept when `reason` is "other" (trimmed, blank = none). */
  otherDetail?: string;
  /** Which surface is cancelling: recorded as `orders.cancel_source`. WHERE, not WHO. */
  source: CancelSource;
  /**
   * WHO is cancelling: the real staff identity from `StaffSessionContext`,
   * required (never silently omitted) so every call site states its case
   * explicitly. Both the POS and HQ now pass the session's real `staffId`
   * (real HQ login replaced `HqAdminKeyGuard`, which had no identity to
   * attribute a cancel to). Recorded as `orders.cancelledByStaffId`, subject
   * to the same first-write-wins rule as `cancelSource`/`cancelReason` (a
   * replay of the SAME cancel never re-stamps this).
   */
  staffId: string | null;
}

/**
 * The ONE implementation of cancelling an order, shared by the POS's staff cancel
 * and HQ's cancel so the rules cannot drift between them:
 *
 * - allowed from any status except `completed` / `cancelled` (dev spec Section 3);
 * - the free-text detail is only meaningful for "other" (the
 *   orders_cancel_detail_only_for_other CHECK enforces it): a stray detail with any
 *   other reason is dropped, and blank counts as none;
 * - the write is a conditional UPDATE, so two racing requests (or a cancel landing
 *   mid-Start) cannot both apply, and a repeat of the SAME cancel is a silent no-op
 *   (the timestamp, `cancel_source` and `cancelledByStaffId` are not re-stamped:
 *   first write wins, even when the repeat comes from the other surface);
 * - a DIFFERENT reason on an already-cancelled order is a 409, never a rewrite;
 * - cancelling an order that had been paid logs `[REFUND NOT IMPLEMENTED]`: the
 *   refund flow (dev spec Section 3, Section 8) does not exist yet.
 *
 * Returns the refreshed order row. Throws `ApiException` for 404 / 400 / 409.
 */
export async function cancelOrder(
  prisma: PrismaService,
  logger: Logger,
  orderId: string,
  input: CancelOrderInput,
): Promise<OrderWithItemsRow> {
  const rawDetail = input.reason === "other" ? input.otherDetail?.trim() : undefined;
  const detail = rawDetail ? rawDetail : null;
  if (detail !== null && detail.length > MAX_CANCEL_DETAIL_LENGTH) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      "CANCEL_DETAIL_TOO_LONG",
      `The cancellation detail can be at most ${MAX_CANCEL_DETAIL_LENGTH} characters.`,
    );
  }

  const order = await loadOrder(prisma, orderId);
  if (isReplayOfSameCancel(order, input.reason, detail)) {
    return order;
  }

  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: { notIn: ["completed", "cancelled"] } },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: input.reason,
      cancelReasonDetail: detail,
      cancelSource: input.source,
      cancelledByStaffId: input.staffId,
    },
  });

  const latest = await loadOrder(prisma, orderId);
  if (count === 0) {
    if (isReplayOfSameCancel(latest, input.reason, detail)) {
      return latest;
    }
    throw new ApiException(
      HttpStatus.CONFLICT,
      latest.status === "cancelled" ? "ORDER_ALREADY_CANCELLED" : "ORDER_NOT_CANCELLABLE",
      latest.status === "cancelled"
        ? `Order ${latest.displayId} was already cancelled (${latest.cancelReason}).`
        : `Order ${latest.displayId} is ${latest.status} and can no longer be cancelled.`,
    );
  }

  if (order.paidAt !== null) {
    // Dev spec Section 3: cancelling a paid order should trigger the refund
    // flow. That flow (Billplz refunds) does not exist yet, so say so loudly
    // rather than let a cancelled-but-charged order pass silently. Orders
    // paid by the payment STUB (payment_id NULL) moved no money.
    logger.warn(
      `[REFUND NOT IMPLEMENTED] Order ${latest.displayId} (${orderId}) was cancelled after payment` +
        (order.paymentId === null ? " — paid by the payment STUB, nothing to refund." : " — a REAL payment may need refunding manually."),
    );
  }
  return latest;
}

async function loadOrder(prisma: PrismaService, orderId: string): Promise<OrderWithItemsRow> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) {
    throw new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", `Order "${orderId}" not found.`);
  }
  return order;
}

/** True if `order` is already cancelled with exactly this reason/detail. */
function isReplayOfSameCancel(order: OrderWithItemsRow, reason: string, detail: string | null): boolean {
  return order.status === "cancelled" && order.cancelReason === reason && order.cancelReasonDetail === detail;
}
