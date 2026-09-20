import type { OrderWithItems } from "@hey-food/api-client";
import { OrderWithItemsSchema } from "@hey-food/api-client";
import type { Order, OrderItem, OrderItemModifier } from "@prisma/client";
import { Prisma } from "@prisma/client";

/**
 * What every order query includes, so `toOrderDto` always has items and
 * modifiers. Items are read in id order: Prisma's cuid ids are generated
 * with a monotonic counter, so this is the order they were created — i.e.
 * the order the customer added them.
 */
export const orderInclude = {
  orderItems: {
    orderBy: { id: "asc" },
    include: { modifiers: { orderBy: { id: "asc" } } },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithItemsRow = Order & {
  orderItems: Array<OrderItem & { modifiers: OrderItemModifier[] }>;
};

const iso = (date: Date | null): string | null => (date ? date.toISOString() : null);

/**
 * Prisma row -> api-client `OrderWithItems`, validated against the schema on
 * the way out (same "every response matches its schema" rule as the outlet
 * endpoints). Deliberately drops the guest identity columns
 * (`guestPhone`, `guestTokenHash`) and idempotency bookkeeping: none is part
 * of the contract, and a token hash must never leave the server.
 */
export function toOrderDto(order: OrderWithItemsRow): OrderWithItems {
  return OrderWithItemsSchema.parse({
    id: order.id,
    outletId: order.outletId,
    customerId: order.customerId,
    displayId: order.displayId,
    status: order.status,
    subtotal: order.subtotal.toNumber(),
    serviceFee: order.serviceFee.toNumber(),
    total: order.total.toNumber(),
    paymentId: order.paymentId,
    createdAt: order.createdAt.toISOString(),
    paidAt: iso(order.paidAt),
    receivedAt: iso(order.receivedAt),
    preparingAt: iso(order.preparingAt),
    readyAt: iso(order.readyAt),
    notifiedAt: iso(order.notifiedAt),
    collectedAt: iso(order.collectedAt),
    completedAt: iso(order.completedAt),
    cancelledAt: iso(order.cancelledAt),
    cancelReason: order.cancelReason,
    cancelReasonDetail: order.cancelReasonDetail,
    items: order.orderItems.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      nameSnapshot: item.nameSnapshot,
      priceSnapshot: item.priceSnapshot.toNumber(),
      quantity: item.quantity,
      notes: item.notes,
      modifiers: item.modifiers.map((modifier) => ({
        id: modifier.id,
        orderItemId: modifier.orderItemId,
        groupNameSnapshot: modifier.groupNameSnapshot,
        optionNameSnapshot: modifier.optionNameSnapshot,
        priceDeltaSnapshot: modifier.priceDeltaSnapshot.toNumber(),
        quantity: modifier.quantity,
      })),
    })),
  });
}
