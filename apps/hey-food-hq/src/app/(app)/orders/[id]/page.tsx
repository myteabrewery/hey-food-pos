import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import type { AdminOrderDetail } from "@hey-food/api-client";

import { BackendError } from "@/components/BackendError";
import { CancelOrderPanel } from "@/components/CancelOrderPanel";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { AdminApiError, getOrder } from "@/lib/admin-api";
import { formatRM } from "@/lib/format";
import { CANCEL_SOURCE_LABEL, cancelReasonLabel, formatOrderTime } from "@/lib/order-format";

export const dynamic = "force-dynamic";

/**
 * Order Detail (dev spec Section 9.4: "links into the same order detail data
 * model"): one order in full, from any outlet. The customer's phone number is shown
 * MASKED only (the full number never leaves the backend: this app has no login).
 * The cancel action at the bottom is HQ's, and it can cancel ANY outlet's order.
 */
export default async function OrderDetailPage({ params }: { params: { id: string } }): Promise<ReactElement> {
  let detail: AdminOrderDetail;
  try {
    detail = await getOrder(params.id);
  } catch (caught) {
    if (caught instanceof AdminApiError && caught.status === 404) notFound();
    return (
      <div className="mx-auto max-w-4xl px-8 py-6">
        <Link href="/orders" className="text-hq-body text-brand-teal">
          ← Back to orders
        </Link>
        <BackendError title="Couldn't load this order" message={caught instanceof AdminApiError ? caught.message : "Couldn't load this order."} />
      </div>
    );
  }

  const { order, outlet, customer, payment, notifications, cancelSource } = detail;
  const cancellable = order.status !== "completed" && order.status !== "cancelled";

  const timeline: Array<{ label: string; at: string | null }> = [
    { label: "Placed", at: order.createdAt },
    { label: "Paid", at: order.paidAt },
    { label: "Received by the outlet's POS", at: order.receivedAt },
    { label: "Started (preparing)", at: order.preparingAt },
    { label: "Marked ready", at: order.readyAt },
    { label: "Collected", at: order.collectedAt },
    { label: "Completed", at: order.completedAt },
    { label: "Cancelled", at: order.cancelledAt },
  ];

  return (
    <div className="mx-auto max-w-4xl px-8 py-6">
      <Link href="/orders" className="text-hq-body text-brand-teal">
        ← Back to orders
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-hq-display font-bold text-brand-ink" data-testid="display-id">
          {order.displayId}
        </h1>
        <OrderStatusBadge status={order.status} />
        {payment.kind === "stub" && <span className="rounded-pill bg-brand-soft px-2 py-0.5 text-hq-caption font-bold text-brand-muted">TEST PAYMENT</span>}
      </div>
      <p className="mt-1 text-hq-body text-brand-muted">
        {outlet.name} · business day {detail.businessDate}
      </p>

      {order.status === "cancelled" && (
        <section className="mt-4 rounded-md border border-danger-solid bg-danger-tint p-4 text-hq-body text-danger-solid" data-testid="cancel-summary">
          <p className="font-bold">
            Cancelled {cancelSource ? CANCEL_SOURCE_LABEL[cancelSource] : ""}
            {order.cancelledAt ? ` · ${formatOrderTime(order.cancelledAt)}` : ""}
          </p>
          <p className="mt-1">
            Reason: {cancelReasonLabel(order.cancelReason)}
            {order.cancelReasonDetail ? ` — “${order.cancelReasonDetail}”` : ""}
          </p>
          <p className="mt-1 text-hq-caption">Who cancelled it is not recorded: there is no login to attribute it to.</p>
        </section>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-md border border-brand-line bg-brand-white p-4">
          <h2 className="text-hq-heading font-bold text-brand-ink">Customer</h2>
          <p className="mt-2 text-hq-body text-brand-ink" data-testid="customer">
            {customer.kind === "app" ? "App customer" : "Guest (web checkout)"}
            {customer.phoneMasked ? ` · ${customer.phoneMasked}` : ""}
          </p>
          <p className="mt-1 text-hq-caption text-brand-muted">The full phone number is not shown in HQ.</p>
        </section>

        <section className="rounded-md border border-brand-line bg-brand-white p-4">
          <h2 className="text-hq-heading font-bold text-brand-ink">Payment</h2>
          <p className="mt-2 text-hq-body text-brand-ink" data-testid="payment">
            {payment.kind === "none" && "Not paid yet."}
            {payment.kind === "stub" && "Marked paid by the payment stub (test mode): no money moved."}
            {payment.kind === "real" && `${payment.provider ?? "Provider"} · ${payment.status ?? "?"} · ${payment.amount === null ? "" : formatRM(payment.amount)}`}
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-md border border-brand-line bg-brand-white p-4">
        <h2 className="text-hq-heading font-bold text-brand-ink">Items</h2>
        <ul className="mt-2" data-testid="items">
          {order.items.map((item) => (
            <li key={item.id} className="border-b border-brand-line py-3 last:border-b-0">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-hq-body font-semibold text-brand-ink">
                  {item.quantity} × {item.nameSnapshot}
                </span>
                <span className="text-hq-body text-brand-ink">{formatRM(item.priceSnapshot * item.quantity)}</span>
              </div>
              {item.modifiers.length > 0 && (
                <ul className="mt-1 pl-4 text-hq-caption text-brand-muted">
                  {item.modifiers.map((modifier) => (
                    <li key={modifier.id}>
                      {modifier.groupNameSnapshot}: {modifier.optionNameSnapshot}
                      {modifier.quantity > 1 ? ` ×${modifier.quantity}` : ""}
                      {modifier.priceDeltaSnapshot !== 0 ? ` (${modifier.priceDeltaSnapshot > 0 ? "+" : "−"}${formatRM(Math.abs(modifier.priceDeltaSnapshot))} each)` : ""}
                    </li>
                  ))}
                </ul>
              )}
              {item.notes && <p className="mt-1 pl-4 text-hq-caption italic text-brand-muted">Note: {item.notes}</p>}
            </li>
          ))}
        </ul>
        <dl className="mt-3 grid max-w-xs grid-cols-2 gap-y-1 text-hq-body">
          <dt className="text-brand-muted">Subtotal</dt>
          <dd className="text-right text-brand-ink">{formatRM(order.subtotal)}</dd>
          <dt className="text-brand-muted">Service fee</dt>
          <dd className="text-right text-brand-ink">{formatRM(order.serviceFee)}</dd>
          <dt className="font-bold text-brand-ink">Total</dt>
          <dd className="text-right font-bold text-brand-ink" data-testid="total">
            {formatRM(order.total)}
          </dd>
        </dl>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-md border border-brand-line bg-brand-white p-4">
          <h2 className="text-hq-heading font-bold text-brand-ink">Timeline (Kuala Lumpur time)</h2>
          <ol className="mt-2" data-testid="timeline">
            {timeline
              .filter((step) => step.at !== null)
              .map((step) => (
                <li key={step.label} className="flex justify-between gap-4 py-1 text-hq-body">
                  <span className="text-brand-ink">{step.label}</span>
                  <span className="text-brand-muted">{formatOrderTime(step.at as string)}</span>
                </li>
              ))}
          </ol>
        </section>

        <section className="rounded-md border border-brand-line bg-brand-white p-4">
          <h2 className="text-hq-heading font-bold text-brand-ink">Customer notifications</h2>
          {notifications.length === 0 ? (
            <p className="mt-2 text-hq-body text-brand-muted" data-testid="no-notifications">
              None sent.
            </p>
          ) : (
            <ul className="mt-2" data-testid="notifications">
              {notifications.map((n) => (
                <li key={n.id} className="py-1 text-hq-body text-brand-ink">
                  <span className="font-semibold uppercase">{n.channel}</span> · {formatOrderTime(n.sentAt)}
                  <span className="block text-hq-caption text-brand-muted">
                    {n.event ?? "older record"} · {n.stub ? "STUB: nothing was actually sent" : n.provider ?? "unknown provider"} ·{" "}
                    {n.accepted === null ? "accepted: unknown" : n.accepted ? "accepted by provider" : `not accepted${n.error ? `: ${n.error}` : ""}`} ·{" "}
                    {n.delivered ? "delivered" : "delivery not tracked"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6" data-testid="cancel-section">
        {cancellable ? (
          <CancelOrderPanel orderId={order.id} displayId={order.displayId} status={order.status} paymentKind={payment.kind} />
        ) : order.status === "completed" ? (
          <p className="text-hq-body text-brand-muted">A completed order can&apos;t be cancelled here (dev spec Section 3). Refunds aren&apos;t built yet.</p>
        ) : null}
      </section>
    </div>
  );
}
