import { OutletProductOverrideSchema, ProductSchema } from "@hey-food/api-client";
import type { OutletProductOverride, Product } from "@hey-food/shared-types";

// STUB DATA — no PATCH /pos/outlets/:id/products/:productId/availability
// endpoint exists on the backend yet, so Menu Availability toggles a
// local mock OutletProductOverride list instead of anything real. Product
// names/prices/categories/IDs match apps/hey-food-backend/prisma/seed-
// placeholder.ts exactly, same convention as mock/orders.ts.

const OUTLET_ID = "outlet_paradigm_mall";

export function createMockProducts(): Product[] {
  return rawMockProducts().map((product) => ProductSchema.parse(product));
}

function rawMockProducts(): Product[] {
  return [
    {
      id: "prod_chicken_rice",
      businessId: "biz_hey_food",
      name: "Chicken Rice",
      description: "Steamed chicken, fragrant rice, chili sauce.",
      imageUrl: "",
      category: "Rice",
      masterPrice: 8.0,
    },
    {
      id: "prod_fried_noodles",
      businessId: "biz_hey_food",
      name: "Fried Noodles",
      description: "Wok-fried noodles with vegetables and egg.",
      imageUrl: "",
      category: "Noodles",
      masterPrice: 7.5,
    },
    {
      id: "prod_fried_chicken",
      businessId: "biz_hey_food",
      name: "Fried Chicken (2pc)",
      description: "Crispy fried chicken, two pieces.",
      imageUrl: "",
      category: "Chicken",
      masterPrice: 9.0,
    },
    {
      id: "prod_iced_tea",
      businessId: "biz_hey_food",
      name: "Iced Tea",
      description: "Sweetened iced tea.",
      imageUrl: "",
      category: "Drinks",
      masterPrice: 3.0,
    },
    {
      id: "prod_nasi_lemak_ayam",
      businessId: "biz_hey_food",
      name: "Nasi Lemak Ayam",
      description: "Coconut rice with sambal, egg, peanuts, and fried chicken.",
      imageUrl: "",
      category: "Rice",
      masterPrice: 7.0,
    },
  ];
}

// One override row per product (not just "the exceptions", unlike a real
// backend which only stores rows that actually deviate) — simpler for a
// local mock, and every row's priceOverride stays null since staff can
// only ever touch isAvailable here (dev spec Section 5.3). Fried Chicken
// starts sold out, reproducing seed-placeholder.ts's own "sold-out Fried
// Chicken at Paradigm Mall" starting state exactly.
export function createMockOverrides(): OutletProductOverride[] {
  return rawMockProducts().map((product) =>
    OutletProductOverrideSchema.parse({
      id: `override_mock_${product.id}`,
      outletId: OUTLET_ID,
      productId: product.id,
      isAvailable: product.id !== "prod_fried_chicken",
      priceOverride: null,
    }),
  );
}
