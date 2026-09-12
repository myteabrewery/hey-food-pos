import type { OutletHealthStatus } from "@hey-food/design-tokens";

// STUB DATA — docs/hey-food-developer-spec-v1.md Section 9.1: real
// dashboard aggregates and outlet health are computed by a scheduled
// server-side job, not live on every page load, and no such job (or any
// aggregation endpoint at all) exists yet. Everything here is static
// placeholder data, surfaced with an on-screen banner on the Dashboard
// screen itself — same treatment as the Outlet POS's Daily Summary,
// since these are exactly the kind of numbers someone could mistake for
// real business metrics.

export interface TodayStats {
  totalSalesRM: number;
  ordersCount: number;
  avgOrderValueRM: number;
  pctVsYesterday: number;
}

/**
 * Outlet identity fields (`id`, `name`) match the real seeded outlets in
 * apps/hey-food-backend/prisma/seed-placeholder.ts exactly — these three
 * are the only outlets that actually exist in this system, unlike the
 * blueprint mockup's 5-outlet example (Paradigm Mall/KSL City/Mid
 * Valley/Southkey/City Square), which included two outlets that were
 * never actually seeded. `salesRM`, `ordersCount`, and `health` are
 * invented mock numbers — Outlet itself (shared-types) has no such
 * fields, since these are always computed, never stored.
 */
export interface OutletPerformance {
  outletId: string;
  outletName: string;
  salesRM: number;
  ordersCount: number;
  health: OutletHealthStatus;
  healthLabel: string;
}

export function getMockTodayStats(): TodayStats {
  return {
    totalSalesRM: 12750.4,
    ordersCount: 486,
    avgOrderValueRM: 26.23,
    pctVsYesterday: 8.7,
  };
}

// Health/label assignment across the three real outlets is arbitrary,
// purely to demonstrate all three states on-screen — not derived from
// any real signal (there isn't one yet).
export function getMockOutletPerformance(): OutletPerformance[] {
  return [
    {
      outletId: "outlet_paradigm_mall",
      outletName: "Hey Food — Paradigm Mall",
      salesRM: 5820.0,
      ordersCount: 214,
      health: "good",
      healthLabel: "Good",
    },
    {
      outletId: "outlet_ksl_city",
      outletName: "Hey Food — KSL City",
      salesRM: 4210.0,
      ordersCount: 168,
      health: "warning",
      healthLabel: "High order volume",
    },
    {
      outletId: "outlet_mid_valley",
      outletName: "Hey Food — Mid Valley",
      salesRM: 2720.4,
      ordersCount: 104,
      health: "critical",
      healthLabel: "POS offline",
    },
  ];
}
