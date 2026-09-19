import type { OrderWithItems } from "@hey-food/api-client";
import { OrderWithItemsSchema } from "@hey-food/api-client";
import { OrderStatus } from "@hey-food/shared-types";
import type { OrderItem, OrderItemModifier } from "@hey-food/shared-types";

// STUB DATA — there is no real order-creation endpoint yet (POST /orders
// is blocked on auth, per docs/STATUS.md), so the queue is seeded with
// mock orders instead of a live feed. Same pattern as the Customer App's
// api/orders.ts getActiveOrder() stub: hand-built objects validated
// against the real OrderWithItemsSchema, so the shape is proven correct
// ahead of the backend actually existing.
//
// Product names/prices/modifier options come from the two backend seed
// profiles, and four of the five orders now carry real customizations so
// the Order Detail screen can be tested against something realistic:
// - Chicken Rice, Iced Tea, Nasi Lemak Ayam: seed-placeholder.ts (Paradigm
//   Mall's real menu) — Chicken Rice's Spice Level / Add-ons / Remove groups.
// - DIY Soup Bowl: seed-soup-stall.ts (a DIFFERENT business/outlet's menu).
//   Paradigm Mall doesn't sell it in either seed, so these orders are
//   internally inconsistent with the mock outlet — accepted, because it's
//   the only seeded product with per-option quantities (Fish Balls x2) and
//   the multi-group shape the detail screen most needs to handle.
//
// This module only produces the *initial* queue state — PosShell owns all
// subsequent status transitions in local state, since there's nothing real
// to sync them to yet.

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const OUTLET_ID = "outlet_paradigm_mall";
const SERVICE_FEE = 2.0;

/** One selected modifier option, as OrderItemModifier snapshots it. */
type ModifierSpec = [group: string, option: string, priceDelta: number, quantity?: number];

function item(
  orderId: string,
  n: number,
  productId: string,
  name: string,
  price: number,
  quantity: number,
  modifiers: ModifierSpec[] = [],
  notes: string | null = null,
): OrderItem {
  const id = `orderitem_mock_${orderId}_${n}`;
  const snapshots: OrderItemModifier[] = modifiers.map(([group, option, priceDelta, modQuantity], i) => ({
    id: `ordermod_mock_${orderId}_${n}_${i + 1}`,
    orderItemId: id,
    groupNameSnapshot: group,
    optionNameSnapshot: option,
    priceDeltaSnapshot: priceDelta,
    quantity: modQuantity ?? 1,
  }));

  return {
    id,
    orderId: `order_mock_${orderId}`,
    productId,
    nameSnapshot: name,
    priceSnapshot: price,
    quantity,
    notes,
    modifiers: snapshots,
  };
}

/**
 * Same arithmetic the server does at order creation (base price plus
 * sum(priceDeltaSnapshot * quantity), times the line quantity) — computed
 * here rather than hand-typed so a mock order's subtotal can never
 * disagree with its own items.
 */
function subtotalOf(items: OrderItem[]): number {
  return items.reduce((sum, line) => {
    const modifiersPerUnit = line.modifiers.reduce((m, mod) => m + mod.priceDeltaSnapshot * mod.quantity, 0);
    return sum + (line.priceSnapshot + modifiersPerUnit) * line.quantity;
  }, 0);
}

export function createMockOrders(): OrderWithItems[] {
  // PM101 — Chicken Rice with a spice pick, two add-ons and a removal, plus a
  // plain drink line: a mixed order (customized + plain items together).
  const items101 = [
    item("101", 1, "prod_chicken_rice", "Chicken Rice", 8.0, 1, [
      ["Spice Level", "Medium", 0],
      ["Add-ons", "Extra Egg", 1.5],
      ["Add-ons", "Extra Chicken", 3.0],
      ["Remove", "No Onions", 0],
    ]),
    item("101", 2, "prod_iced_tea", "Iced Tea", 3.0, 2),
  ];

  // PM102 — deliberately left plain (one item, no modifiers): the detail
  // screen must stay clean for the simple case, not just the busy one.
  const items102 = [item("102", 1, "prod_nasi_lemak_ayam", "Nasi Lemak Ayam", 7.0, 1)];

  // PM103 — the stress case for the modifier layout: two DIY Soup Bowls (one
  // with a carb, one without and with a customer note and FOUR ingredients)
  // plus a drink. Mirrors seed-soup-stall.ts's Soup Base / Ingredients /
  // Carb Base groups and prices.
  const items103 = [
    item("103", 1, "prod_diy_soup_bowl", "DIY Soup Bowl", 5.0, 1, [
      ["Soup Base", "Tomyam", 2.0],
      ["Ingredients", "Fish Balls", 1.5, 2],
      ["Ingredients", "Tofu", 1.0, 1],
      ["Carb Base", "Yellow Noodle", 0],
    ]),
    item(
      "103",
      2,
      "prod_diy_soup_bowl",
      "DIY Soup Bowl",
      5.0,
      1,
      [
        ["Soup Base", "Clear Soup", 0],
        ["Ingredients", "Prawns", 3.0, 2],
        ["Ingredients", "Mixed Vegetables", 1.0, 1],
        ["Ingredients", "Meatballs", 2.0, 3],
        ["Ingredients", "Fish Balls", 1.5, 1],
      ],
      "Less salt please, thanks!",
    ),
    item("103", 3, "prod_iced_tea", "Iced Tea", 3.0, 1),
  ];

  // PM104 — one line item with quantity 2 AND modifiers: each unit gets the
  // same customization (the detail screen has to say so).
  const items104 = [
    item("104", 1, "prod_chicken_rice", "Chicken Rice", 8.0, 2, [
      ["Spice Level", "Spicy", 0],
      ["Add-ons", "Extra Egg", 1.5],
    ]),
  ];

  // PM105 — two identical soup bowls on one line (quantity 2).
  const items105 = [
    item("105", 1, "prod_diy_soup_bowl", "DIY Soup Bowl", 5.0, 2, [
      ["Soup Base", "Laksa", 2.0],
      ["Ingredients", "Meatballs", 2.0, 1],
      ["Ingredients", "Tofu", 1.0, 1],
      ["Carb Base", "Rice", 0],
    ]),
  ];

  const orders: OrderWithItems[] = [
    {
      id: "order_mock_101",
      outletId: OUTLET_ID,
      customerId: "customer_mock_1",
      displayId: "PM101",
      status: OrderStatus.Received,
      subtotal: subtotalOf(items101),
      serviceFee: SERVICE_FEE,
      total: subtotalOf(items101) + SERVICE_FEE,
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
      cancelReasonDetail: null,
      items: items101,
    },
    {
      id: "order_mock_102",
      outletId: OUTLET_ID,
      customerId: "customer_mock_2",
      displayId: "PM102",
      status: OrderStatus.Received,
      subtotal: subtotalOf(items102),
      serviceFee: SERVICE_FEE,
      total: subtotalOf(items102) + SERVICE_FEE,
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
      cancelReasonDetail: null,
      items: items102,
    },
    {
      id: "order_mock_103",
      outletId: OUTLET_ID,
      customerId: "customer_mock_3",
      displayId: "PM103",
      status: OrderStatus.Preparing,
      subtotal: subtotalOf(items103),
      serviceFee: SERVICE_FEE,
      total: subtotalOf(items103) + SERVICE_FEE,
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
      cancelReasonDetail: null,
      items: items103,
    },
    {
      id: "order_mock_104",
      outletId: OUTLET_ID,
      customerId: "customer_mock_4",
      displayId: "PM104",
      status: OrderStatus.Ready,
      subtotal: subtotalOf(items104),
      serviceFee: SERVICE_FEE,
      total: subtotalOf(items104) + SERVICE_FEE,
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
      cancelReasonDetail: null,
      items: items104,
    },
    {
      id: "order_mock_105",
      outletId: OUTLET_ID,
      customerId: "customer_mock_5",
      displayId: "PM105",
      status: OrderStatus.Preparing,
      subtotal: subtotalOf(items105),
      serviceFee: SERVICE_FEE,
      total: subtotalOf(items105) + SERVICE_FEE,
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
      cancelReasonDetail: null,
      items: items105,
    },
  ];

  return orders.map((order) => OrderWithItemsSchema.parse(order));
}
