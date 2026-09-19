import Link from "next/link";
import type { ReactElement } from "react";

import { HealthDot } from "@/components/HealthDot";
import { formatRM } from "@/lib/format";
import { getMockOutletsWithStats } from "@/mock/outlets";

/**
 * Outlet List (dev spec Section 6/9.2, blueprint's outlet drill-down
 * concept) — every outlet, each row clicking through to that outlet's
 * Detail screen. A styled list of rows (matching Dashboard's existing
 * "fake table via flex rows" pattern), not a literal HTML `<table>` —
 * consistent with how Dashboard's Outlet Performance/Health sections
 * are already built, and avoids introducing a second layout convention
 * for what's structurally the same kind of content.
 *
 * STUB DATA: mock/outlets.ts — the 3 real seeded outlets, with invented
 * sales/orders/health numbers. Same visible "PLACEHOLDER DATA" banner
 * as Dashboard, for the same reason.
 */
export default function OutletsPage(): ReactElement {
  const outlets = getMockOutletsWithStats();

  return (
    <div className="mx-auto max-w-5xl px-8 py-6">
      <h1 className="text-hq-display font-bold text-brand-ink">Outlets</h1>

      <div className="mt-4 rounded-md border border-brand-line bg-brand-white px-4 py-2 text-center text-hq-caption font-semibold text-brand-muted">
        PLACEHOLDER DATA — no live aggregation endpoint yet
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-brand-line bg-brand-white">
        <div className="flex items-center gap-4 border-b border-brand-line px-4 py-2 text-hq-caption font-bold tracking-wide text-brand-muted">
          <span className="flex-1">OUTLET</span>
          <span className="w-16">STATUS</span>
          <span className="w-28 text-right">TODAY&apos;S SALES</span>
          <span className="w-20 text-right">ORDERS</span>
          <span className="w-40">HEALTH</span>
        </div>

        {outlets.map((entry, index) => (
          <Link
            key={entry.outlet.id}
            href={`/outlets/${entry.outlet.id}`}
            className={`flex items-center gap-4 px-4 py-3 text-hq-body hover:bg-brand-soft ${
              index < outlets.length - 1 ? "border-b border-brand-line" : ""
            }`}
          >
            <span className="flex-1 font-semibold text-brand-ink">{entry.outlet.name}</span>
            <span className="w-16 capitalize text-brand-muted">{entry.outlet.status}</span>
            <span className="w-28 text-right text-brand-ink">{formatRM(entry.today.salesRM)}</span>
            <span className="w-20 text-right text-brand-muted">{entry.today.ordersCount}</span>
            <span className="flex w-40 items-center gap-2">
              <HealthDot health={entry.health} />
              <span className="text-brand-muted">{entry.healthLabel}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
