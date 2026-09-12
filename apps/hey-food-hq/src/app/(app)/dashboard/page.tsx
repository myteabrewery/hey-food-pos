import type { ReactElement } from "react";

import type { OutletHealthStatus } from "@hey-food/design-tokens";

import { getMockOutletPerformance, getMockTodayStats } from "@/mock/dashboard";
import { MOCK_STAFF } from "@/mock/session";

// Written as complete, static class strings (not built via template
// interpolation of `outlet.health`) so Tailwind's content scanner can
// actually see and generate them — an interpolated `bg-health-${health}`
// would compile fine but silently produce no styles, since Tailwind
// never sees the literal class name anywhere in the source.
const HEALTH_DOT_CLASS: Record<OutletHealthStatus, string> = {
  good: "bg-health-good",
  warning: "bg-health-warning",
  critical: "bg-health-critical",
};

function formatRM(amount: number): string {
  return `RM${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Dashboard (docs/hey-food-developer-spec-v1.md Section 9.1, blueprint
 * Section 6's "Home dashboard" mockup) — today's aggregates, per-outlet
 * performance, and the 3-state outlet health indicator. Layout/content
 * structure follows the blueprint mockup; colors do not — that mockup
 * predates the Ember/Char → navy/teal/yellow/cream palette pivot, so
 * every color here comes from the current @hey-food/design-tokens, not
 * from re-reading the old mockup screenshots.
 *
 * STUB DATA: mock/dashboard.ts. Section 9.1 is explicit that these
 * aggregates are computed by a scheduled server-side job, not live per
 * page load — no such job, or any aggregation endpoint, exists yet. The
 * banner below is the same visible-placeholder treatment as Outlet
 * POS's Daily Summary, for the same reason: these look like real
 * business numbers and there's no other way to tell they're not.
 */
export default function DashboardPage(): ReactElement {
  const stats = getMockTodayStats();
  const outlets = getMockOutletPerformance();

  return (
    <div className="mx-auto max-w-5xl px-8 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-hq-display font-bold text-brand-ink">Dashboard</h1>
        <p className="text-hq-caption text-brand-muted">{MOCK_STAFF.name}</p>
      </div>

      <div className="mt-4 rounded-md border border-brand-line bg-brand-white px-4 py-2 text-center text-hq-caption font-semibold text-brand-muted">
        PLACEHOLDER DATA — no live aggregation endpoint yet
      </div>

      <section className="mt-6">
        <h2 className="text-hq-caption font-bold tracking-wide text-brand-muted">TODAY</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total sales" value={formatRM(stats.totalSalesRM)} />
          <StatCard label="Orders" value={String(stats.ordersCount)} />
          <StatCard label="Avg order value" value={formatRM(stats.avgOrderValueRM)} />
          <StatCard
            label="vs yesterday"
            value={`${stats.pctVsYesterday > 0 ? "+" : ""}${stats.pctVsYesterday.toFixed(1)}%`}
          />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-hq-caption font-bold tracking-wide text-brand-muted">
          OUTLET PERFORMANCE
        </h2>
        <div className="mt-2 overflow-hidden rounded-md border border-brand-line bg-brand-white">
          {outlets.map((outlet, index) => (
            <div
              key={outlet.outletId}
              className={`flex items-center justify-between px-4 py-3 text-hq-body ${
                index < outlets.length - 1 ? "border-b border-brand-line" : ""
              }`}
            >
              <span className="font-semibold text-brand-ink">{outlet.outletName}</span>
              <div className="flex gap-6 text-right">
                <span className="text-brand-ink">{formatRM(outlet.salesRM)}</span>
                <span className="w-20 text-brand-muted">{outlet.ordersCount} orders</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-hq-caption font-bold tracking-wide text-brand-muted">OUTLET HEALTH</h2>
        <div className="mt-2 overflow-hidden rounded-md border border-brand-line bg-brand-white">
          {outlets.map((outlet, index) => (
            <div
              key={outlet.outletId}
              className={`flex items-center gap-3 px-4 py-3 text-hq-body ${
                index < outlets.length - 1 ? "border-b border-brand-line" : ""
              }`}
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${HEALTH_DOT_CLASS[outlet.health]}`}
                aria-hidden="true"
              />
              <span className="flex-1 font-semibold text-brand-ink">{outlet.outletName}</span>
              <span className="text-brand-muted">{outlet.healthLabel}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps): ReactElement {
  return (
    <div className="rounded-md border border-brand-line bg-brand-white px-4 py-3">
      <p className="text-hq-heading font-bold text-brand-ink">{value}</p>
      <p className="text-hq-caption font-semibold text-brand-muted">{label}</p>
    </div>
  );
}
