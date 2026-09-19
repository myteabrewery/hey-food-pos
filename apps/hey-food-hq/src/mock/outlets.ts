import { OutletSchema } from "@hey-food/api-client";
import type { OutletHealthStatus } from "@hey-food/design-tokens";
import type { Outlet } from "@hey-food/shared-types";

// STUB DATA — no real aggregation endpoint or scheduled health-
// computation job exists yet (dev spec Section 9.1), same as
// mock/dashboard.ts. `outlet` fields match the real seeded outlets in
// apps/hey-food-backend/prisma/seed-placeholder.ts exactly (id, name,
// address, coordinates, operating hours, status) — everything else
// (sales, orders, health, queue counts, prep/cancellation/refund
// figures) is invented mock data, validated only where a real schema
// exists to validate against (Outlet itself; there's no shared-types
// shape for "today's outlet stats" since that's always computed,
// never stored).
//
// Health assignment (Paradigm Mall good / KSL City warning / Mid Valley
// critical) matches the previous pass's Dashboard mock data exactly,
// for the same reason noted there: arbitrary, purely to demonstrate all
// three states, carried over here so the screens don't silently
// disagree about the same outlet.

const OPERATING_HOURS_10_TO_22 = {
  mon: { open: "10:00", close: "22:00" },
  tue: { open: "10:00", close: "22:00" },
  wed: { open: "10:00", close: "22:00" },
  thu: { open: "10:00", close: "22:00" },
  fri: { open: "10:00", close: "22:00" },
  sat: { open: "10:00", close: "22:00" },
  sun: { open: "10:00", close: "22:00" },
};

export interface OutletQueueCounts {
  newCount: number;
  preparingCount: number;
  readyCount: number;
}

export interface OutletTodayStats {
  salesRM: number;
  ordersCount: number;
  avgPrepMinutes: number;
  cancelledCount: number;
  refundsCount: number;
}

export interface OutletWithStats {
  outlet: Outlet;
  health: OutletHealthStatus;
  healthLabel: string;
  /**
   * Staged for demo purposes only, per explicit instruction — true for
   * exactly one outlet (Mid Valley) so the Detail screen's warning
   * banner has something to actually show. Not derived from any real
   * connectivity check; dev spec Section 9.1's own "POS offline > 5 min"
   * threshold is what a real version of this flag would be computed
   * from, once a real connection-monitoring signal exists.
   */
  posOffline: boolean;
  queue: OutletQueueCounts;
  today: OutletTodayStats;
}

export function getMockOutletsWithStats(): OutletWithStats[] {
  const entries: Array<{ outlet: Outlet } & Omit<OutletWithStats, "outlet">> = [
    {
      outlet: {
        id: "outlet_paradigm_mall",
        businessId: "biz_hey_food",
        name: "Hey Food — Paradigm Mall",
        address: "1 Utama Shopping Centre, Petaling Jaya",
        lat: 3.1499,
        lng: 101.6122,
        geofenceRadiusM: 100,
        operatingHours: OPERATING_HOURS_10_TO_22,
        status: "open",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      health: "good",
      healthLabel: "Good",
      posOffline: false,
      queue: { newCount: 2, preparingCount: 3, readyCount: 1 },
      today: { salesRM: 5820.0, ordersCount: 214, avgPrepMinutes: 8, cancelledCount: 3, refundsCount: 1 },
    },
    {
      outlet: {
        id: "outlet_ksl_city",
        businessId: "biz_hey_food",
        name: "Hey Food — KSL City",
        address: "KSL City Mall, Johor Bahru",
        lat: 1.4927,
        lng: 103.7414,
        geofenceRadiusM: 100,
        operatingHours: OPERATING_HOURS_10_TO_22,
        status: "open",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      health: "warning",
      healthLabel: "High order volume",
      posOffline: false,
      queue: { newCount: 6, preparingCount: 5, readyCount: 2 },
      today: { salesRM: 4210.0, ordersCount: 168, avgPrepMinutes: 12, cancelledCount: 4, refundsCount: 2 },
    },
    {
      outlet: {
        id: "outlet_mid_valley",
        businessId: "biz_hey_food",
        name: "Hey Food — Mid Valley",
        address: "Mid Valley Megamall, Kuala Lumpur",
        lat: 3.1177,
        lng: 101.6774,
        geofenceRadiusM: 100,
        operatingHours: OPERATING_HOURS_10_TO_22,
        status: "open",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      health: "critical",
      healthLabel: "POS offline",
      posOffline: true,
      queue: { newCount: 0, preparingCount: 0, readyCount: 0 },
      today: { salesRM: 2720.4, ordersCount: 104, avgPrepMinutes: 9, cancelledCount: 1, refundsCount: 0 },
    },
  ];

  return entries.map(({ outlet, ...stats }) => ({ outlet: OutletSchema.parse(outlet), ...stats }));
}

export function getMockOutletWithStats(outletId: string): OutletWithStats | undefined {
  return getMockOutletsWithStats().find((entry) => entry.outlet.id === outletId);
}
