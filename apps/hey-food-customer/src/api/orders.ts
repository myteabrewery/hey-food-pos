import type { CreateOrderRequest, OrderWithItems } from "@hey-food/api-client";
import { CreateOrderRequestSchema, OrderWithItemsSchema } from "@hey-food/api-client";
import { OrderStatus } from "@hey-food/shared-types";

/**
 * Stub for `POST /orders` — no real network call, no payment flow, no
 * post-submit navigation yet. Validates the request against the real
 * schema (proving the shape is correct ahead of the backend existing) and
 * logs it, same pattern as the other api/ stubs.
 */
export async function createOrder(request: CreateOrderRequest): Promise<void> {
  const validated = CreateOrderRequestSchema.parse(request);
  console.log("POST /orders (stub) ->", JSON.stringify(validated, null, 2));
}

/**
 * Stub for "does the customer have an active order" — always resolves to
 * a mock order with status "preparing" so Home's conditional order-
 * progress section (docs/customer-app-screens-v2.md Section 3.7) is
 * actually visible for review, per explicit instruction for this pass.
 * A real implementation would return null (or similar) when there's no
 * active order — that's why the section is described as "conditional"
 * even though this stub always shows it.
 */
export async function getActiveOrder(): Promise<OrderWithItems> {
  const now = new Date().toISOString();

  const mockOrder: OrderWithItems = {
    id: "order_mock_active",
    outletId: "outlet_paradigm_mall",
    customerId: "customer_mock",
    displayId: "PM042",
    status: OrderStatus.Preparing,
    subtotal: 11.0,
    serviceFee: 2.0,
    total: 13.0,
    paymentId: "payment_mock",
    createdAt: now,
    paidAt: now,
    receivedAt: now,
    preparingAt: now,
    readyAt: null,
    notifiedAt: null,
    collectedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
    items: [
      {
        id: "orderitem_mock_1",
        orderId: "order_mock_active",
        productId: "prod_chicken_rice",
        nameSnapshot: "Chicken Rice",
        priceSnapshot: 8.0,
        quantity: 1,
        notes: null,
        // Mechanical stopgap for the OrderItem.modifiers field added by
        // docs/product-customization-v1.md Stage 1 — this mock predates
        // modifier selection and has none to show. Stage 3 (Product
        // Detail screen + modifier selection UI) is what will actually
        // populate this.
        modifiers: [],
      },
      {
        id: "orderitem_mock_2",
        orderId: "order_mock_active",
        productId: "prod_iced_tea",
        nameSnapshot: "Iced Tea",
        priceSnapshot: 3.0,
        quantity: 1,
        notes: null,
        // See the comment on the first item above — same stopgap.
        modifiers: [],
      },
    ],
  };

  return OrderWithItemsSchema.parse(mockOrder);
}
