import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import type {
  CancelOrderRequest,
  CancelOrderResponse,
  PosOrderStatus,
  PosQueueResponse,
  UpdateOrderStatusResponse,
} from "@hey-food/api-client";
import { PosQueueResponseSchema } from "@hey-food/api-client";
import type { OrderStatus } from "@prisma/client";

import { ApiException } from "../common/api-exception";
import { NotificationsService } from "../notifications/notifications.service";
import { orderInclude, toOrderDto, type OrderWithItemsRow } from "../orders/order.mapper";
import { cancelOrder } from "../orders/order-cancel";
import { PrismaService } from "../prisma/prisma.service";
import type { StaffSessionContext } from "../staff/staff-session.guard";

/**
 * The staff-triggered half of the order state machine (dev spec Section 3).
 * Each target status has exactly ONE legal source status and one timestamp —
 * "no state can be skipped", so a device that was offline and reconnects
 * can't jump an order straight to `ready`:
 *
 *   received  -> preparing   (staff "Start")             sets preparing_at
 *   preparing -> ready       (staff "Ready")             sets ready_at
 *   ready     -> collected   (staff "Collect")           sets collected_at
 *
 * `paid -> received` is NOT a staff action (see `listQueue`), and
 * `collected -> completed` is automatic and immediate, so a Collect writes
 * both `collected_at` and `completed_at` in one step.
 */
const STAFF_TRANSITIONS: Record<PosOrderStatus, { from: OrderStatus; stamp: "preparingAt" | "readyAt" | "collectedAt" }> = {
  preparing: { from: "received", stamp: "preparingAt" },
  ready: { from: "preparing", stamp: "readyAt" },
  collected: { from: "ready", stamp: "collectedAt" },
};

// A status a request for `target` has ALREADY been applied at: a repeat is a
// no-op, not an error (dev spec Section 10: "server rejects duplicate
// transition silently rather than erroring visibly"). A retry after a lost
// response therefore succeeds instead of making the tablet roll back.
const ALREADY_APPLIED: Record<PosOrderStatus, OrderStatus[]> = {
  preparing: ["preparing"],
  ready: ["ready"],
  collected: ["collected", "completed"],
};

type StaffCancelRequest = Extract<CancelOrderRequest, { actor: "staff" }>;

@Injectable()
export class PosOrdersService {
  private readonly logger = new Logger(PosOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * The outlet's live queue. This read is also the POS "sync" of dev spec
   * Section 3: every `paid` order for the outlet becomes `received`
   * (`received_at` stamped) the moment a POS fetches the queue — "automatic on
   * successful sync, not a staff action". It is the one write on a GET, and it
   * is idempotent. An order the POS could not reach stays `paid`, which is the
   * honest state (HQ can see "paid, not received").
   */
  async listQueue(outletId: string, session: StaffSessionContext): Promise<PosQueueResponse> {
    // Unlike an order's outlet (hidden as "not found"), the URL's outlet id
    // isn't secret — a mismatch here is a plain 403, not a 404.
    if (outletId !== session.outletId) {
      throw new ApiException(HttpStatus.FORBIDDEN, "OUTLET_NOT_ASSIGNED", "You aren't logged in for that outlet.");
    }
    const outlet = await this.prisma.outlet.findUnique({ where: { id: outletId }, select: { id: true } });
    if (!outlet) {
      throw new ApiException(HttpStatus.NOT_FOUND, "OUTLET_NOT_FOUND", `Outlet "${outletId}" not found.`);
    }

    await this.prisma.order.updateMany({
      where: { outletId, status: "paid" },
      data: { status: "received", receivedAt: new Date() },
    });

    const orders = await this.prisma.order.findMany({
      where: { outletId, status: { in: ["received", "preparing", "ready"] } },
      orderBy: { createdAt: "asc" },
      include: orderInclude,
    });

    return PosQueueResponseSchema.parse({ data: orders.map(toOrderDto) });
  }

  async advance(orderId: string, target: PosOrderStatus, session: StaffSessionContext): Promise<UpdateOrderStatusResponse> {
    const rule = STAFF_TRANSITIONS[target];
    const order = await this.load(orderId);
    this.requireOwnOutlet(order.outletId, session);

    if (ALREADY_APPLIED[target].includes(order.status)) {
      return toOrderDto(order);
    }
    if (order.status !== rule.from) {
      throw this.invalidTransition(order, target, rule.from);
    }

    const now = new Date();
    const { count } = await this.prisma.order.updateMany({
      // Conditional on the source status, so two racing requests (or a cancel
      // landing between our read and this write) can't both apply.
      where: { id: orderId, status: rule.from },
      data:
        target === "collected"
          ? { status: "completed", collectedAt: now, completedAt: now }
          : { status: target, [rule.stamp]: now },
    });

    const latest = await this.load(orderId);
    if (count === 0) {
      if (ALREADY_APPLIED[target].includes(latest.status)) {
        return toOrderDto(latest); // the same transition won a race: fine
      }
      throw this.invalidTransition(latest, target, rule.from);
    }

    // Reaching here means THIS request performed the transition (the update
    // above matched), so a "ready" notification fires exactly once per order:
    // a repeated Ready is the silent no-op returned earlier, and a request that
    // lost a race took the count === 0 branch. Fire-and-forget on purpose:
    // notifyOrderReady never throws, and a slow or failing provider must not
    // slow or fail the staff's tap.
    if (target === "ready") {
      void this.notifications.notifyOrderReady(latest);
    }
    return toOrderDto(latest);
  }

  /**
   * Staff cancel. The rules live in ONE place, `cancelOrder` (src/orders/order-cancel.ts),
   * shared with HQ's cancel; the POS records `cancel_source = pos`.
   */
  async cancel(orderId: string, request: StaffCancelRequest, session: StaffSessionContext): Promise<CancelOrderResponse> {
    const order = await this.load(orderId);
    this.requireOwnOutlet(order.outletId, session);

    const cancelled = await cancelOrder(this.prisma, this.logger, orderId, {
      reason: request.reason,
      otherDetail: request.otherDetail,
      source: "pos",
    });
    return toOrderDto(cancelled);
  }

  private async load(orderId: string): Promise<OrderWithItemsRow> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
    if (!order) {
      throw new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", `Order "${orderId}" not found.`);
    }
    return order;
  }

  /**
   * An order belonging to a different outlet than this session's is treated
   * as NOT FOUND (hides its existence, same framing as a cross-business
   * product in admin-menu) rather than 403, since from this device's
   * perspective it correctly isn't there. Closes the demonstrated weakness of
   * the old device-key stopgap: "the same key a Paradigm tablet holds toggled
   * KSL City's Chicken Rice" (see the README).
   */
  private requireOwnOutlet(orderOutletId: string, session: StaffSessionContext): void {
    if (orderOutletId !== session.outletId) {
      throw new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Order not found.");
    }
  }

  private invalidTransition(order: OrderWithItemsRow, target: PosOrderStatus, requiredFrom: OrderStatus): ApiException {
    return new ApiException(
      HttpStatus.CONFLICT,
      "INVALID_STATUS_TRANSITION",
      `Order ${order.displayId} is "${order.status}", so it can't move to "${target}" (that needs "${requiredFrom}").`,
    );
  }
}
