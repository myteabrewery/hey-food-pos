import Link from "next/link";
import type { ReactElement } from "react";

import { HealthDot } from "@/components/HealthDot";
import { getMockTodayStats } from "@/mock/dashboard";
import { getMockOutletsWithStats } from "@/mock/outlets";
import { MOCK_STAFF } from "@/mock/session";
import { formatRM } from "@/lib/format";

/**
 * Dashboard (docs/hey-food-developer-spec-v1.md Section 9.1, blueprint
 * Section 6's "Home dashboard" mockup) — today's aggregates, per-outlet
 * performance, and the 3-state outlet health indicator. Layout/content
 * structure follows the blueprint mockup; colors do not — that mockup
 * predates the Ember/Char → navy/teal/yellow/cream palette pivot, so
 * every color here comes from the current @hey-food/design-tokens, not
 * from re-reading the old mockup screenshots.
 *
 * Both outlet lists are clickable through to that outlet's Detail
 * screen (blueprint's "HQ oversight flow": Dashboard → notice a flagged
 * outlet → drill in), per explicit instruction for this pass.
 *
 * STUB DATA: mock/dashboard.ts + mock/outlets.ts. Section 9.1 is
 * explicit that these aggregates are computed by a scheduled
 * server-side job, not live per page load — no such job, or any
 * aggregation endpoint, exists yet. The banner below is the same
 * visible-placeholder treatment as Outlet POS's Daily Summary, for the
 * same reason: these look like real business numbers and there's no
 * other way to tell they're not.
 */
export default function DashboardPage(): ReactElement {
  const stats = getMockTodayStats();
  const outlets = getMockOutletsWithStats();

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
          {outlets.map((entry, index) => (
            <Link
              key={entry.outlet.id}
              href={`/outlets/${entry.outlet.id}`}
              className={`flex items-center justify-between px-4 py-3 text-hq-body hover:bg-brand-soft ${
                index < outlets.length - 1 ? "border-b border-brand-line" : ""
              }`}
            >
              <span className="font-semibold text-brand-ink">{entry.outlet.name}</span>
              <div className="flex gap-6 text-right">
                <span className="text-brand-ink">{formatRM(entry.today.salesRM)}</span>
                <span className="w-20 text-brand-muted">{entry.today.ordersCount} orders</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-hq-caption font-bold tracking-wide text-brand-muted">OUTLET HEALTH</h2>
        <div className="mt-2 overflow-hidden rounded-md border border-brand-line bg-brand-white">
          {outlets.map((entry, index) => (
            <Link
              key={entry.outlet.id}
              href={`/outlets/${entry.outlet.id}`}
              className={`flex items-center gap-3 px-4 py-3 text-hq-body hover:bg-brand-soft ${
                index < outlets.length - 1 ? "border-b border-brand-line" : ""
              }`}
            >
              <HealthDot health={entry.health} />
              <span className="flex-1 font-semibold text-brand-ink">{entry.outlet.name}</span>
              <span className="text-brand-muted">{entry.healthLabel}</span>
            </Link>
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
