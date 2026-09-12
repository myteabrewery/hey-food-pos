import type { OrderWithItems } from "@hey-food/api-client";
import { OrderWithItemsSchema } from "@hey-food/api-client";
import { OrderStatus } from "@hey-food/shared-types";

// STUB DATA — there is no real order-creation endpoint yet (POST /orders
// is blocked on auth, per docs/STATUS.md), so the queue is seeded with
// mock orders instead of a live feed. Same pattern as the Customer App's
// api/orders.ts getActiveOrder() stub: hand-built objects validated
// against the real OrderWithItemsSchema, so the shape is proven correct
// ahead of the backend actually existing. Product names/prices/IDs match
// apps/hey-food-backend/prisma/seed-placeholder.ts exactly.
//
// This module only produces the *initial* queue state — QueueScreen owns
// all subsequent status transitions in local component state, since
// there's nothing real to sync them to yet.

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const OUTLET_ID = "outlet_paradigm_mall";

export function createMockOrders(): OrderWithItems[] {
  const orders: OrderWithItems[] = [
    {
      id: "order_mock_101",
      outletId: OUTLET_ID,
      customerId: "customer_mock_1",
      displayId: "PM101",
      status: OrderStatus.Received,
      subtotal: 14.0,
      serviceFee: 2.0,
      total: 16.0,
      paymentId: "payment_mock_101",
      createdAt: minutesAgo(3),
      paidAt: minutesAgo(3),
      receivedAt: minutesAgo(3),
      preparingAt: null,
      readyAt: null,
      notifiedAt: null,
      collectedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      items: [
        {
          id: "orderitem_mock_101_1",
          orderId: "order_mock_101",
          productId: "prod_chicken_rice",
          nameSnapshot: "Chicken Rice",
          priceSnapshot: 8.0,
          quantity: 1,
          notes: null,
          modifiers: [],
        },
        {
          id: "orderitem_mock_101_2",
          orderId: "order_mock_101",
          productId: "prod_iced_tea",
          nameSnapshot: "Iced Tea",
          priceSnapshot: 3.0,
          quantity: 2,
          notes: null,
          modifiers: [],
        },
      ],
    },
    {
      id: "order_mock_102",
      outletId: OUTLET_ID,
      customerId: "customer_mock_2",
      displayId: "PM102",
      status: OrderStatus.Received,
      subtotal: 7.0,
      serviceFee: 2.0,
      total: 9.0,
      paymentId: "payment_mock_102",
      createdAt: minutesAgo(1),
      paidAt: minutesAgo(1),
      receivedAt: minutesAgo(1),
      preparingAt: null,
      readyAt: null,
      notifiedAt: null,
      collectedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      items: [
        {
          id: "orderitem_mock_102_1",
          orderId: "order_mock_102",
          productId: "prod_nasi_lemak_ayam",
          nameSnapshot: "Nasi Lemak Ayam",
          priceSnapshot: 7.0,
          quantity: 1,
          notes: null,
          modifiers: [],
        },
      ],
    },
    {
      id: "order_mock_103",
      outletId: OUTLET_ID,
      customerId: "customer_mock_3",
      displayId: "PM103",
      status: OrderStatus.Preparing,
      subtotal: 19.5,
      serviceFee: 2.0,
      total: 21.5,
      paymentId: "payment_mock_103",
      createdAt: minutesAgo(8),
      paidAt: minutesAgo(8),
      receivedAt: minutesAgo(8),
      preparingAt: minutesAgo(4),
      readyAt: null,
      notifiedAt: null,
      collectedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      items: [
        {
          id: "orderitem_mock_103_1",
          orderId: "order_mock_103",
          productId: "prod_fried_chicken",
          nameSnapshot: "Fried Chicken (2pc)",
          priceSnapshot: 9.0,
          quantity: 1,
          notes: null,
          modifiers: [],
        },
        {
          id: "orderitem_mock_103_2",
          orderId: "order_mock_103",
          productId: "prod_fried_noodles",
          nameSnapshot: "Fried Noodles",
          priceSnapshot: 7.5,
          quantity: 1,
          notes: null,
          modifiers: [],
        },
        {
          id: "orderitem_mock_103_3",
          orderId: "order_mock_103",
          productId: "prod_iced_tea",
          nameSnapshot: "Iced Tea",
          priceSnapshot: 3.0,
          quantity: 1,
          notes: null,
          modifiers: [],
        },
      ],
    },
    {
      id: "order_mock_104",
      outletId: OUTLET_ID,
      customerId: "customer_mock_4",
      displayId: "PM104",
      status: OrderStatus.Ready,
      subtotal: 16.0,
      serviceFee: 2.0,
      total: 18.0,
      paymentId: "payment_mock_104",
      createdAt: minutesAgo(15),
      paidAt: minutesAgo(15),
      receivedAt: minutesAgo(15),
      preparingAt: minutesAgo(10),
      readyAt: minutesAgo(2),
      notifiedAt: minutesAgo(2),
      collectedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      items: [
        {
          id: "orderitem_mock_104_1",
          orderId: "order_mock_104",
          productId: "prod_chicken_rice",
          nameSnapshot: "Chicken Rice",
          priceSnapshot: 8.0,
          quantity: 2,
          notes: null,
          modifiers: [],
        },
      ],
    },
    {
      id: "order_mock_105",
      outletId: OUTLET_ID,
      customerId: "customer_mock_5",
      displayId: "PM105",
      status: OrderStatus.Preparing,
      subtotal: 7.5,
      serviceFee: 2.0,
      total: 9.5,
      paymentId: "payment_mock_105",
      createdAt: minutesAgo(6),
      paidAt: minutesAgo(6),
      receivedAt: minutesAgo(6),
      preparingAt: minutesAgo(3),
      readyAt: null,
      notifiedAt: null,
      collectedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      items: [
        {
          id: "orderitem_mock_105_1",
          orderId: "order_mock_105",
          productId: "prod_fried_noodles",
          nameSnapshot: "Fried Noodles",
          priceSnapshot: 7.5,
          quantity: 1,
          notes: null,
          modifiers: [],
        },
      ],
    },
  ];

  return orders.map((order) => OrderWithItemsSchema.parse(order));
}
