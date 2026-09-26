import Link from "next/link";
import type { ReactElement } from "react";

import type { AdminCustomerListResponse, AdminGuestCustomerListResponse } from "@hey-food/api-client";

import { BackendError } from "@/components/BackendError";
import { AdminApiError, listCustomers, listGuestCustomers } from "@/lib/admin-api";
import { formatRM } from "@/lib/format";
import { formatOrderTime } from "@/lib/order-format";

// Live data: never serve a cached list.
export const dynamic = "force-dynamic";

interface SearchParams {
  tab?: string;
  q?: string;
  cursor?: string;
}

type Tab = "guest" | "app";

function resolveTab(raw: string | undefined): Tab {
  return raw === "app" ? "app" : "guest";
}

/** A link back to /customers with this tab and query kept, paging dropped. */
function tabHref(tab: Tab, q: string | undefined): string {
  const params = new URLSearchParams({ tab });
  if (q) params.set("q", q);
  return `/customers?${params.toString()}`;
}

const fieldClass = "mt-1 w-full rounded-md border border-brand-line bg-brand-white px-3 py-2 text-hq-body text-brand-ink";

/**
 * Customers (dev spec Section 2/9.4: "central `Customer` record — order
 * history query spans all outlets naturally"). TWO views, not one — see
 * admin-customers.ts's doc comment for why:
 *
 * - **Guest Orders by Phone** (default tab): guest web-checkout orders
 *   grouped by phone. NOT a real account — there is no login, no name, just
 *   a phone number that has ordered before. This is where the real, growing
 *   data actually lives today.
 * - **App Accounts**: the real `Customer` entity dev spec 9.4 describes.
 *   Today there is exactly one row (the seed) — nothing creates a `Customer`
 *   outside the seed script until customer OTP auth exists (guest checkout
 *   deliberately never creates one). Kept, honestly labeled as near-empty,
 *   because it's the spec's actual data model and it becomes real the
 *   moment OTP auth ships.
 *
 * Every phone number shown is MASKED — the full number never leaves the
 * backend (same rule as Orders).
 */
export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }): Promise<ReactElement> {
  const tab = resolveTab(searchParams.tab);
  const q = searchParams.q?.trim() || undefined;

  return (
    <div className="mx-auto max-w-5xl px-8 py-6">
      <h1 className="text-hq-display font-bold text-brand-ink">Customers</h1>
      <p className="mt-1 text-hq-body text-brand-muted">
        {tab === "guest"
          ? "Guest checkout orders, grouped by phone number — there is no account here, just a phone that has ordered before."
          : "Real app-account customers. There is no customer sign-up yet, so this is near-empty today — see the note below."}
      </p>

      <div className="mt-4 flex gap-2 border-b border-brand-line">
        <Link
          href={tabHref("guest", undefined)}
          className={`px-3 py-2 text-hq-body font-semibold ${tab === "guest" ? "border-b-2 border-brand-teal text-brand-ink" : "text-brand-muted"}`}
          data-testid="tab-guest"
        >
          Guest Orders by Phone
        </Link>
        <Link
          href={tabHref("app", undefined)}
          className={`px-3 py-2 text-hq-body font-semibold ${tab === "app" ? "border-b-2 border-brand-teal text-brand-ink" : "text-brand-muted"}`}
          data-testid="tab-app"
        >
          App Accounts
        </Link>
      </div>

      <form method="get" action="/customers" className="mt-4 flex flex-wrap items-end gap-3" aria-label="Search customers">
        <input type="hidden" name="tab" value={tab} />
        <div className="w-64">
          <label htmlFor="f-q" className="text-hq-caption font-bold text-brand-muted">
            {tab === "guest" ? "PHONE NUMBER" : "NAME OR PHONE"}
          </label>
          <input id="f-q" name="q" defaultValue={q ?? ""} placeholder={tab === "guest" ? "e.g. 0123456789" : "e.g. Ali or 0123456789"} autoComplete="off" className={fieldClass} />
        </div>
        <button type="submit" className="min-h-11 rounded-md bg-brand-teal px-5 text-hq-body font-semibold text-brand-white hover:bg-brand-tealDark">
          Search
        </button>
        {q && (
          <Link href={tabHref(tab, undefined)} className="text-hq-body font-semibold text-brand-muted">
            Clear
          </Link>
        )}
      </form>

      {tab === "guest" ? <GuestCustomersTable q={q} cursor={searchParams.cursor} /> : <AppAccountsTable q={q} cursor={searchParams.cursor} />}
    </div>
  );
}

async function GuestCustomersTable({ q, cursor }: { q: string | undefined; cursor: string | undefined }): Promise<ReactElement> {
  let result: AdminGuestCustomerListResponse | null = null;
  let failure: string | null = null;
  try {
    result = await listGuestCustomers({ q, cursor });
  } catch (caught) {
    failure = caught instanceof AdminApiError ? caught.message : "Couldn't load guest orders.";
  }
  const rows = result?.data ?? [];

  if (failure !== null) return <BackendError title="Couldn't load guest orders" message={failure} />;
  if (rows.length === 0) {
    return (
      <p className="mt-6 text-hq-body text-brand-muted" data-testid="no-guest-customers">
        {q ? "No guest phone numbers match this search." : "No guest orders yet."}
      </p>
    );
  }

  return (
    <>
      <div className="mt-6 overflow-x-auto rounded-md border border-brand-line bg-brand-white">
        <div className="flex min-w-[720px] items-center gap-4 border-b border-brand-line px-4 py-2 text-hq-caption font-bold tracking-wide text-brand-muted">
          <span className="w-40">PHONE</span>
          <span className="w-20 text-right">ORDERS</span>
          <span className="w-32 text-right">LIFETIME VALUE</span>
          <span className="flex-1">FIRST ORDER</span>
          <span className="flex-1">LAST ORDER</span>
        </div>
        <ul data-testid="guest-customers-list">
          {rows.map((row, index) => (
            <li key={row.key} className={index < rows.length - 1 ? "border-b border-brand-line" : ""}>
              <Link href={`/customers/guest/${encodeURIComponent(row.key)}`} className="flex min-w-[720px] items-center gap-4 px-4 py-3 text-hq-body hover:bg-brand-soft">
                <span className="w-40 font-semibold text-brand-ink">{row.phoneMasked}</span>
                <span className="w-20 text-right text-brand-ink">{row.orderCount}</span>
                <span className="w-32 text-right font-semibold text-brand-ink">{formatRM(row.lifetimeValue)}</span>
                <span className="flex-1 text-hq-caption text-brand-muted">{formatOrderTime(row.firstOrderAt)}</span>
                <span className="flex-1 text-hq-caption text-brand-muted">{formatOrderTime(row.lastOrderAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <PageNav tab="guest" q={q} cursor={cursor} nextCursor={result?.meta.nextCursor} count={rows.length} noun="phone number" />
    </>
  );
}

async function AppAccountsTable({ q, cursor }: { q: string | undefined; cursor: string | undefined }): Promise<ReactElement> {
  let result: AdminCustomerListResponse | null = null;
  let failure: string | null = null;
  try {
    result = await listCustomers({ q, cursor });
  } catch (caught) {
    failure = caught instanceof AdminApiError ? caught.message : "Couldn't load customers.";
  }
  const rows = result?.data ?? [];

  return (
    <>
      {failure !== null ? (
        <BackendError title="Couldn't load customers" message={failure} />
      ) : rows.length === 0 ? (
        <p className="mt-6 text-hq-body text-brand-muted" data-testid="no-app-customers">
          {q ? "No app accounts match this search." : "No app accounts yet."}
        </p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-md border border-brand-line bg-brand-white">
            <div className="flex min-w-[760px] items-center gap-4 border-b border-brand-line px-4 py-2 text-hq-caption font-bold tracking-wide text-brand-muted">
              <span className="flex-1">NAME</span>
              <span className="w-40">PHONE</span>
              <span className="w-24 text-right">LOYALTY PTS</span>
              <span className="w-20 text-right">ORDERS</span>
              <span className="w-32 text-right">LIFETIME VALUE</span>
            </div>
            <ul data-testid="app-customers-list">
              {rows.map((row, index) => (
                <li key={row.id} className={index < rows.length - 1 ? "border-b border-brand-line" : ""}>
                  <Link href={`/customers/${encodeURIComponent(row.id)}`} className="flex min-w-[760px] items-center gap-4 px-4 py-3 text-hq-body hover:bg-brand-soft">
                    <span className="flex-1 font-semibold text-brand-ink">{row.name}</span>
                    <span className="w-40 text-brand-ink">{row.phoneMasked}</span>
                    <span className="w-24 text-right text-brand-ink">{row.loyaltyPoints}</span>
                    <span className="w-20 text-right text-brand-ink">{row.orderCount}</span>
                    <span className="w-32 text-right font-semibold text-brand-ink">{formatRM(row.lifetimeValue)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <PageNav tab="app" q={q} cursor={cursor} nextCursor={result?.meta.nextCursor} count={rows.length} noun="account" />
        </>
      )}
      <p className="mt-6 text-hq-caption text-brand-muted">
        There is no customer sign-up yet (dev spec Section 5.5&apos;s customer OTP auth isn&apos;t built), and a guest web checkout deliberately never creates one of these — so
        this list stays near-empty until that exists. The <Link href={tabHref("guest", undefined)} className="font-semibold text-brand-teal">Guest Orders by Phone</Link> tab
        is where real customer activity shows up today.
      </p>
    </>
  );
}

function PageNav({
  tab,
  q,
  cursor,
  nextCursor,
  count,
  noun,
}: {
  tab: Tab;
  q: string | undefined;
  cursor: string | undefined;
  nextCursor: string | undefined;
  count: number;
  noun: string;
}): ReactElement {
  const base = tabHref(tab, q);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-hq-body">
      <span className="text-brand-muted">
        {count} {noun}
        {count === 1 ? "" : "s"} shown{nextCursor ? ", more available" : ""}
      </span>
      {cursor && (
        <Link href={base} className="font-semibold text-brand-teal">
          ← First page
        </Link>
      )}
      {nextCursor && (
        <Link href={`${base}&cursor=${encodeURIComponent(nextCursor)}`} className="font-semibold text-brand-teal" data-testid="next-page">
          Next page →
        </Link>
      )}
    </div>
  );
}
