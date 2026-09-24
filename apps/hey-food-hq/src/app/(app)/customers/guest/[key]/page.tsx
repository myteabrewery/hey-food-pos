import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import type { AdminGuestCustomerDetailResponse } from "@hey-food/api-client";

import { BackendError } from "@/components/BackendError";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { AdminApiError, getGuestCustomer } from "@/lib/admin-api";
import { formatRM } from "@/lib/format";
import { formatOrderTime } from "@/lib/order-format";

export const dynamic = "force-dynamic";

/**
 * Guest phone detail — NOT a real account: `key` is an opaque, one-way
 * identifier for a guest phone number (never the phone itself; see
 * admin-customers.ts), so this page never has the raw number to show even
 * server-side. Order history rows link into the already-built Order Detail
 * page, same as the App Account detail.
 */
export default async function GuestCustomerDetailPage({ params, searchParams }: { params: { key: string }; searchParams: { cursor?: string } }): Promise<ReactElement> {
  let detail: AdminGuestCustomerDetailResponse;
  try {
    detail = await getGuestCustomer(params.key, { cursor: searchParams.cursor });
  } catch (caught) {
    if (caught instanceof AdminApiError && caught.status === 404) notFound();
    return (
      <div className="mx-auto max-w-4xl px-8 py-6">
        <Link href="/customers?tab=guest" className="text-hq-body text-brand-teal">
          ← Back to customers
        </Link>
        <BackendError title="Couldn't load this guest phone" message={caught instanceof AdminApiError ? caught.message : "Couldn't load this guest phone."} />
      </div>
    );
  }

  const { phoneMasked, orderCount, lifetimeValue, firstOrderAt, lastOrderAt, orderHistory } = detail;
  const history = orderHistory.data;

  return (
    <div className="mx-auto max-w-4xl px-8 py-6">
      <Link href="/customers?tab=guest" className="text-hq-body text-brand-teal">
        ← Back to customers
      </Link>

      <h1 className="mt-2 text-hq-display font-bold text-brand-ink" data-testid="guest-phone">
        {phoneMasked}
      </h1>
      <p className="mt-1 text-hq-body text-brand-muted">
        Guest checkout — no account, no login. First ordered {formatOrderTime(firstOrderAt)}, last ordered {formatOrderTime(lastOrderAt)}.
      </p>
      <p className="mt-1 text-hq-caption text-brand-muted">The full phone number is not shown in HQ.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-brand-line bg-brand-white p-4">
          <p className="text-hq-caption font-bold tracking-wide text-brand-muted">ORDERS</p>
          <p className="mt-1 text-hq-heading font-bold text-brand-ink" data-testid="order-count">
            {orderCount}
          </p>
        </div>
        <div className="rounded-md border border-brand-line bg-brand-white p-4">
          <p className="text-hq-caption font-bold tracking-wide text-brand-muted">LIFETIME VALUE</p>
          <p className="mt-1 text-hq-heading font-bold text-brand-ink" data-testid="lifetime-value">
            {formatRM(lifetimeValue)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-hq-caption text-brand-muted">Orders and lifetime value exclude pending (unpaid) and cancelled orders; the history below shows every order.</p>

      <h2 className="mt-8 text-hq-heading font-bold text-brand-ink">Order history</h2>
      {history.length === 0 ? (
        <p className="mt-3 text-hq-body text-brand-muted">No orders yet.</p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto rounded-md border border-brand-line bg-brand-white">
            <div className="flex min-w-[640px] items-center gap-4 border-b border-brand-line px-4 py-2 text-hq-caption font-bold tracking-wide text-brand-muted">
              <span className="w-28">ORDER</span>
              <span className="flex-1">OUTLET</span>
              <span className="w-40">PLACED (KL)</span>
              <span className="w-32">STATUS</span>
              <span className="w-24 text-right">TOTAL</span>
            </div>
            <ul data-testid="order-history-list">
              {history.map((order, index) => (
                <li key={order.id} className={index < history.length - 1 ? "border-b border-brand-line" : ""}>
                  <Link href={`/orders/${encodeURIComponent(order.id)}`} className="flex min-w-[640px] items-center gap-4 px-4 py-3 text-hq-body hover:bg-brand-soft">
                    <span className="w-28 font-bold text-brand-ink">{order.displayId}</span>
                    <span className="flex-1 text-brand-ink">{order.outlet.name}</span>
                    <span className="w-40 text-hq-caption text-brand-muted">{formatOrderTime(order.createdAt)}</span>
                    <span className="w-32">
                      <OrderStatusBadge status={order.status} />
                    </span>
                    <span className="w-24 text-right font-semibold text-brand-ink">{formatRM(order.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-hq-body">
            <span className="text-brand-muted">
              {history.length} order{history.length === 1 ? "" : "s"} shown{orderHistory.meta.nextCursor ? ", more available" : ""}
            </span>
            {searchParams.cursor && (
              <Link href={`/customers/guest/${encodeURIComponent(params.key)}`} className="font-semibold text-brand-teal">
                ← First page
              </Link>
            )}
            {orderHistory.meta.nextCursor && (
              <Link
                href={`/customers/guest/${encodeURIComponent(params.key)}?cursor=${encodeURIComponent(orderHistory.meta.nextCursor)}`}
                className="font-semibold text-brand-teal"
                data-testid="next-page"
              >
                Next page →
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
