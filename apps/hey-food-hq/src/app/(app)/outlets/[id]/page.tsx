import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { HealthDot } from "@/components/HealthDot";
import { formatRM } from "@/lib/format";
import { getMockOutletWithStats } from "@/mock/outlets";

export interface OutletDetailPageProps {
  params: { id: string };
}

/**
 * Outlet Detail (dev spec Section 9.2) — "mirrors what that outlet's own
 * POS would show" (live queue counts) "plus the connection-status
 * warning banner (as designed) when relevant." No such banner is
 * actually designed anywhere in the docs beyond that one sentence — its
 * copy/layout below is my own construction, flagged as a judgment call,
 * not a reproduction of an existing mockup.
 *
 * STUB DATA: mock/outlets.ts. Queue counts are a static snapshot, not
 * the live/interactive board the actual POS Queue screen is — this is
 * HQ's read-only vantage on the same concept, not the same component.
 * Same visible "PLACEHOLDER DATA" banner as Dashboard/Outlet List.
 */
export default function OutletDetailPage({ params }: OutletDetailPageProps): ReactElement {
  const entry = getMockOutletWithStats(params.id);

  if (!entry) {
    notFound();
  }

  const { outlet, health, healthLabel, posOffline, queue, today } = entry;

  return (
    <div className="mx-auto max-w-5xl px-8 py-6">
      <div className="text-hq-caption text-brand-muted">
        <Link href="/outlets" className="hover:underline">
          Outlets
        </Link>
        <span> / {outlet.name}</span>
      </div>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-hq-display font-bold text-brand-ink">{outlet.name}</h1>
          <p className="mt-1 text-hq-body text-brand-muted">{outlet.address}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-hq-body font-semibold capitalize text-brand-ink">
            {outlet.status}
          </span>
          <span className="flex items-center gap-2 text-hq-caption text-brand-muted">
            <HealthDot health={health} />
            {healthLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-brand-line bg-brand-white px-4 py-2 text-center text-hq-caption font-semibold text-brand-muted">
        PLACEHOLDER DATA — no live aggregation endpoint yet
      </div>

      {/* STUB — staged for exactly one outlet, per explicit instruction, to
          demonstrate dev spec Section 9.2's connection-status warning
          banner. Copy/layout here is invented, not sourced from any
          existing design. */}
      {posOffline && (
        <div className="mt-4 rounded-md border-2 border-health-critical bg-brand-white px-4 py-3 text-hq-body font-semibold text-health-critical">
          ⚠ This outlet&apos;s POS has lost connection. Live queue data below may be out of date.
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-hq-caption font-bold tracking-wide text-brand-muted">LIVE QUEUE</h2>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <StatCard label="New" value={String(queue.newCount)} />
          <StatCard label="Preparing" value={String(queue.preparingCount)} />
          <StatCard label="Ready" value={String(queue.readyCount)} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-hq-caption font-bold tracking-wide text-brand-muted">TODAY</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Sales" value={formatRM(today.salesRM)} />
          <StatCard label="Orders" value={String(today.ordersCount)} />
          <StatCard label="Avg prep time" value={`${today.avgPrepMinutes} min`} />
          <StatCard label="Cancelled" value={String(today.cancelledCount)} />
          <StatCard label="Refunds" value={String(today.refundsCount)} />
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
