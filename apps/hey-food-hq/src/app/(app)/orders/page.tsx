import Link from "next/link";
import type { ReactElement } from "react";

import type { AdminOrderListResponse } from "@hey-food/api-client";

import { BackendError } from "@/components/BackendError";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { AdminApiError, listOrders } from "@/lib/admin-api";
import { formatRM } from "@/lib/format";
import { CANCEL_SOURCE_LABEL, STATUS_FILTER_OPTIONS, formatOrderTime, kualaLumpurToday, shiftDate, statusParam } from "@/lib/order-format";

// Orders are live data: never serve a cached list.
export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  outlet?: string;
  status?: string;
  from?: string;
  to?: string;
  cursor?: string;
}

/** A link back to /orders with these filters (empty ones dropped). Paging (`cursor`) is never carried over. */
function ordersHref(filters: SearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/orders?${query}` : "/orders";
}

const fieldClass = "mt-1 w-full rounded-md border border-brand-line bg-brand-white px-3 py-2 text-hq-body text-brand-ink";

/**
 * Orders, all outlets (dev spec Section 9.4, blueprint Section 6): a filterable,
 * cursor-paginated table of every outlet's orders, newest first, each row linking to
 * the order's detail. REAL DATA from the backend's /admin/orders, read from this
 * page's server using the logged-in HQ admin's session.
 *
 * The default view HIDES `pending` orders: a pending order is a checkout a guest
 * started and never paid for, and they would bury the real ones. The Status filter
 * brings them back. Filters live in the URL (a plain GET form), so a view can be
 * bookmarked or reloaded. Dates filter on the outlet-local business day (Kuala Lumpur).
 */
export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }): Promise<ReactElement> {
  const filters: SearchParams = {
    q: searchParams.q?.trim() || undefined,
    outlet: searchParams.outlet || undefined,
    status: searchParams.status || undefined,
    from: searchParams.from || undefined,
    to: searchParams.to || undefined,
  };

  let result: AdminOrderListResponse | null = null;
  let failure: string | null = null;
  try {
    result = await listOrders({
      q: filters.q,
      outletId: filters.outlet,
      status: statusParam(filters.status),
      from: filters.from,
      to: filters.to,
      cursor: searchParams.cursor || undefined,
    });
  } catch (caught) {
    failure = caught instanceof AdminApiError ? caught.message : "Couldn't load the orders.";
  }

  const today = kualaLumpurToday();
  const presets = [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: shiftDate(today, -1), to: shiftDate(today, -1) },
    { label: "Last 7 days", from: shiftDate(today, -6), to: today },
  ];
  const orders = result?.data ?? [];
  const nextCursor = result?.meta.nextCursor;
  const filtered = Boolean(filters.q || filters.outlet || filters.status || filters.from || filters.to);

  return (
    <div className="mx-auto max-w-6xl px-8 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-hq-display font-bold text-brand-ink">Orders</h1>
        <Link href={ordersHref(filters)} className="text-hq-body font-semibold text-brand-teal">
          Refresh
        </Link>
      </div>
      <p className="mt-1 text-hq-body text-brand-muted">
        Every outlet&apos;s orders, newest first. Unpaid checkouts (<strong>pending</strong>) are hidden unless you choose them under Status.
      </p>

      <form method="get" action="/orders" className="mt-4 grid gap-4 rounded-md border border-brand-line bg-brand-white p-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Filter orders">
        <div>
          <label htmlFor="f-q" className="text-hq-caption font-bold text-brand-muted">
            ORDER NUMBER
          </label>
          <input id="f-q" name="q" defaultValue={filters.q ?? ""} placeholder="e.g. PM042" autoComplete="off" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="f-outlet" className="text-hq-caption font-bold text-brand-muted">
            OUTLET
          </label>
          <select id="f-outlet" name="outlet" defaultValue={filters.outlet ?? ""} className={fieldClass}>
            <option value="">All outlets</option>
            {(result?.outlets ?? []).map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-status" className="text-hq-caption font-bold text-brand-muted">
            STATUS
          </label>
          <select id="f-status" name="status" defaultValue={filters.status ?? ""} className={fieldClass}>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-from" className="text-hq-caption font-bold text-brand-muted">
            FROM (business day)
          </label>
          <input id="f-from" name="from" type="date" defaultValue={filters.from ?? ""} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="f-to" className="text-hq-caption font-bold text-brand-muted">
            TO (business day)
          </label>
          <input id="f-to" name="to" type="date" defaultValue={filters.to ?? ""} className={fieldClass} />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-5">
          <button type="submit" className="min-h-11 rounded-md bg-brand-teal px-5 text-hq-body font-semibold text-brand-white hover:bg-brand-tealDark">
            Apply filters
          </button>
          <Link href="/orders" className="text-hq-body font-semibold text-brand-muted">
            Clear
          </Link>
          <span className="text-hq-caption text-brand-muted">Quick range:</span>
          {presets.map((preset) => (
            <Link key={preset.label} href={ordersHref({ ...filters, from: preset.from, to: preset.to })} className="text-hq-body font-semibold text-brand-teal">
              {preset.label}
            </Link>
          ))}
        </div>
      </form>

      {failure !== null ? (
        <BackendError title="Couldn't load the orders" message={failure} />
      ) : orders.length === 0 ? (
        <p className="mt-6 text-hq-body text-brand-muted" data-testid="no-orders">
          {filtered ? "No orders match these filters." : "No orders yet."}
        </p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-md border border-brand-line bg-brand-white">
            <div className="flex min-w-[860px] items-center gap-4 border-b border-brand-line px-4 py-2 text-hq-caption font-bold tracking-wide text-brand-muted">
              <span className="w-28">ORDER</span>
              <span className="flex-1">OUTLET</span>
              <span className="w-40">PLACED (KL)</span>
              <span className="w-44">STATUS</span>
              <span className="w-12 text-right">ITEMS</span>
              <span className="w-24 text-right">TOTAL</span>
              <span className="w-36">CUSTOMER</span>
            </div>
            <ul data-testid="orders-list">
              {orders.map((order, index) => (
                <li key={order.id} className={index < orders.length - 1 ? "border-b border-brand-line" : ""}>
                  <Link href={`/orders/${encodeURIComponent(order.id)}`} className="flex min-w-[860px] items-center gap-4 px-4 py-3 text-hq-body hover:bg-brand-soft" data-testid={`order-${order.displayId}`}>
                    <span className="w-28">
                      <span className="block font-bold text-brand-ink">{order.displayId}</span>
                      {order.isStubPaid && <span className="mt-0.5 inline-flex rounded-pill bg-brand-soft px-2 text-hq-caption font-bold text-brand-muted">TEST PAYMENT</span>}
                    </span>
                    <span className="flex-1 text-brand-ink">{order.outlet.name}</span>
                    <span className="w-40 text-hq-caption text-brand-muted">{formatOrderTime(order.createdAt)}</span>
                    <span className="w-44">
                      <OrderStatusBadge status={order.status} />
                      {order.status === "cancelled" && order.cancelSource && (
                        <span className="mt-0.5 block text-hq-caption text-brand-muted" data-testid="cancel-source">
                          {CANCEL_SOURCE_LABEL[order.cancelSource]}
                        </span>
                      )}
                    </span>
                    <span className="w-12 text-right text-brand-muted">{order.itemCount}</span>
                    <span className="w-24 text-right font-semibold text-brand-ink">{formatRM(order.total)}</span>
                    <span className="w-36 text-hq-caption text-brand-muted">
                      {order.customer.kind === "app" ? "App" : "Guest"}
                      {order.customer.phoneMasked ? ` · ${order.customer.phoneMasked}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-hq-body">
            <span className="text-brand-muted" data-testid="shown-count">
              {orders.length} order{orders.length === 1 ? "" : "s"} shown{nextCursor ? ", more available" : ""}
            </span>
            {searchParams.cursor && (
              <Link href={ordersHref(filters)} className="font-semibold text-brand-teal">
                ← First page
              </Link>
            )}
            {nextCursor && (
              <Link href={`${ordersHref(filters)}${ordersHref(filters).includes("?") ? "&" : "?"}cursor=${encodeURIComponent(nextCursor)}`} className="font-semibold text-brand-teal" data-testid="next-page">
                Next page →
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
