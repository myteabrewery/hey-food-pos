// STUB DATA — dev spec Section 5.4: aggregates must be computed
// server-side so POS and HQ never disagree on the same number. No such
// aggregation endpoint exists yet, so there's no real shared-types/
// api-client shape to validate against here (unlike orders.ts and
// products.ts, which validate against real schemas) — these are static
// placeholder numbers only, not a proven-correct contract shape.

export interface DailySummaryStats {
  salesTodayRM: number;
  ordersCount: number;
  avgPrepMinutes: number;
  cancelledCount: number;
}

export interface TopSellingItem {
  productId: string;
  name: string;
  quantitySold: number;
}

export function getMockDailySummaryStats(): DailySummaryStats {
  return {
    salesTodayRM: 284.5,
    ordersCount: 34,
    avgPrepMinutes: 7,
    cancelledCount: 2,
  };
}

export function getMockTopSellingItems(): TopSellingItem[] {
  return [
    { productId: "prod_chicken_rice", name: "Chicken Rice", quantitySold: 19 },
    { productId: "prod_nasi_lemak_ayam", name: "Nasi Lemak Ayam", quantitySold: 14 },
    { productId: "prod_iced_tea", name: "Iced Tea", quantitySold: 12 },
    { productId: "prod_fried_noodles", name: "Fried Noodles", quantitySold: 9 },
  ];
}
