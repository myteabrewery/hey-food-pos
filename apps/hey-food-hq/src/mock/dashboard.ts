// STUB DATA — docs/hey-food-developer-spec-v1.md Section 9.1: real
// dashboard aggregates are computed by a scheduled server-side job, not
// live on every page load, and no such job (or any aggregation endpoint
// at all) exists yet. Surfaced with an on-screen banner on the Dashboard
// screen itself — same treatment as the Outlet POS's Daily Summary,
// since these are exactly the kind of numbers someone could mistake for
// real business metrics.
//
// Per-outlet performance/health data used to live here too, as its own
// `OutletPerformance` shape — moved to mock/outlets.ts once the Outlet
// List/Detail screens needed the same per-outlet data plus more (queue
// counts, prep time, etc.), so Dashboard and Outlets don't maintain two
// separately-invented mock datasets that could silently disagree about
// the same outlet.

export interface TodayStats {
  totalSalesRM: number;
  ordersCount: number;
  avgOrderValueRM: number;
  pctVsYesterday: number;
}

export function getMockTodayStats(): TodayStats {
  return {
    totalSalesRM: 12750.4,
    ordersCount: 486,
    avgOrderValueRM: 26.23,
    pctVsYesterday: 8.7,
  };
}
