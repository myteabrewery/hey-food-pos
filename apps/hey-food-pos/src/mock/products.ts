import type { MenuItem } from "../api/menu";

// DEMO DATA — only used in demo mode (EXPO_PUBLIC_POS_USE_MOCK_ORDERS=1); by
// default Menu Availability reads the real menu from the backend and saves
// toggles to it. Names, prices, categories and IDs match apps/hey-food-backend/
// prisma/seed-placeholder.ts (Paradigm Mall's menu), same convention as
// mock/orders.ts. Fried Chicken starts sold out, reproducing the seed's own
// "sold-out Fried Chicken at Paradigm Mall" starting state.
export function createMockMenuItems(): MenuItem[] {
  return [
    { id: "prod_chicken_rice", name: "Chicken Rice", category: "Rice", price: 8.0, isAvailable: true },
    { id: "prod_fried_noodles", name: "Fried Noodles", category: "Noodles", price: 7.5, isAvailable: true },
    { id: "prod_fried_chicken", name: "Fried Chicken (2pc)", category: "Chicken", price: 9.0, isAvailable: false },
    { id: "prod_iced_tea", name: "Iced Tea", category: "Drinks", price: 3.0, isAvailable: true },
    { id: "prod_nasi_lemak_ayam", name: "Nasi Lemak Ayam", category: "Rice", price: 7.0, isAvailable: true },
  ];
}
