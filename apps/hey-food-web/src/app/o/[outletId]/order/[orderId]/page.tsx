"use client";

import Link from "next/link";
import { useEffect, useState, type ReactElement } from "react";

import type { OrderWithItems } from "@hey-food/api-client";
import { OrderStatus } from "@hey-food/shared-types";

import { formatRM } from "@/lib/format";
import { ApiRequestError, getGuestOrder, payGuestOrder } from "@/lib/guest-api";
import { markStubPaid, useGuestToken, useStubPaid } from "@/lib/guest-session";

const POLL_MS = 5_000;
const RETRY_MS = 10_000;
const DONE: ReadonlySet<string> = new Set([OrderStatus.Collected, OrderStatus.Completed, OrderStatus.Cancelled]);

/** Customer-facing wording for each order status. */
function statusView(status: string): { label: string; detail: string } {
  switch (status) {
    case OrderStatus.Pending:
      return { label: "Awaiting payment", detail: "Your order isn't sent to the kitchen until it's paid." };
    case OrderStatus.Paid:
    case OrderStatus.Received:
      return { label: "Order received", detail: "The kitchen has your order and will start on it shortly." };
    case OrderStatus.Preparing:
      return { label: "Preparing", detail: "Your food is being made." };
    case OrderStatus.Ready:
      return { label: "Ready for pickup", detail: "Head to the counter and show your order number." };
    case OrderStatus.Collected:
    case OrderStatus.Completed:
      return { label: "Collected", detail: "Enjoy your meal!" };
    case OrderStatus.Cancelled:
      return { label: "Cancelled", detail: "This order was cancelled. Ask at the counter if you're unsure why." };
    default:
      return { label: status, detail: "" };
  }
}

/**
 * The guest's order page: live status (polled every few seconds until the
 * order is finished) and, while it's still `pending`, the payment step.
 * Everything here is authorized by the order's guest token from
 * sessionStorage — there is no login — so an order can only be viewed in the
 * browser that placed it.
 */
export default function OrderPage({ params }: { params: { outletId: string; orderId: string } }): ReactElement {
  const token = useGuestToken(params.orderId);
  const stubPaid = useStubPaid(params.orderId);
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  // Bumped after paying to refetch immediately instead of waiting for the poll.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const latest = await getGuestOrder(params.orderId, token);
        if (cancelled) return;
        setOrder(latest);
        setLoadError(null);
        if (!DONE.has(latest.status)) timer = setTimeout(load, POLL_MS);
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof ApiRequestError && caught.status === 404) {
          setNotFound(true);
          return;
        }
        setLoadError(caught instanceof ApiRequestError ? caught.message : "Couldn't refresh your order.");
        timer = setTimeout(load, RETRY_MS);
      }
    };
    void load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [params.orderId, token, reloadKey]);

  async function handlePay() {
    if (!token || paying) return;
    setPaying(true);
    setPayError(null);
    try {
      const result = await payGuestOrder(params.orderId, token);
      if (result.isStub) {
        // TEMPORARY: the backend's payment stub already marked the order
        // paid, so there is nowhere to redirect — just refresh in place.
        markStubPaid(params.orderId);
        setReloadKey((key) => key + 1);
        setPaying(false);
      } else {
        // Real payment: hand the browser to the payment provider's page,
        // which returns the customer here afterwards.
        window.location.assign(result.redirectUrl);
      }
    } catch (caught) {
      setPayError(caught instanceof ApiRequestError ? caught.message : "Payment couldn't be started. Please try again.");
      setPaying(false);
    }
  }

  const menuHref = `/o/${encodeURIComponent(params.outletId)}`;

  if (!token || notFound) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-web-heading font-semibold">We can&apos;t show this order here</h1>
        <p className="mt-2 text-brand-muted">
          An order can only be opened in the browser that placed it. If you&apos;ve already paid, your order is with the
          kitchen — just tell the counter your mobile number.
        </p>
        <Link href={menuHref} className="mt-4 inline-flex min-h-tap items-center text-brand-teal underline">
          Back to the menu
        </Link>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-brand-muted" aria-live="polite">
          {loadError ?? "Loading your order…"}
        </p>
      </main>
    );
  }

  const view = statusView(order.status);
  const isPending = order.status === OrderStatus.Pending;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-10 pt-6">
      {stubPaid && (
        <p role="note" className="mb-4 rounded-lg border border-brand-yellow bg-brand-soft p-3 text-web-caption font-semibold">
          TEST MODE — no real payment was taken. Online payment isn&apos;t live yet.
        </p>
      )}

      <p className="text-web-caption text-brand-muted">Order number</p>
      <h1 className="text-web-display font-semibold" data-testid="display-id">
        {order.displayId}
      </h1>
      <p
        className="mt-2 inline-block rounded-pill bg-brand-navy px-3 py-1 text-web-caption font-semibold text-brand-white"
        data-testid="status"
      >
        {view.label}
      </p>
      <p className="mt-2 text-brand-muted">{view.detail}</p>
      {loadError && (
        <p role="status" className="mt-2 text-web-caption text-brand-muted">
          {loadError} Retrying…
        </p>
      )}

      <ul className="mt-6 divide-y divide-brand-line overflow-hidden rounded-lg border border-brand-line bg-brand-white">
        {order.items.map((item) => {
          const perUnit =
            item.priceSnapshot + item.modifiers.reduce((sum, m) => sum + m.priceDeltaSnapshot * m.quantity, 0);
          return (
            <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {item.quantity} × {item.nameSnapshot}
                </p>
                {item.modifiers.length > 0 && (
                  <p className="text-web-caption text-brand-muted">
                    {item.modifiers
                      .map((m) => (m.quantity > 1 ? `${m.quantity}× ${m.optionNameSnapshot}` : m.optionNameSnapshot))
                      .join(", ")}
                  </p>
                )}
                {item.notes && <p className="text-web-caption text-brand-muted">Note: {item.notes}</p>}
              </div>
              <span className="shrink-0">{formatRM(perUnit * item.quantity)}</span>
            </li>
          );
        })}
        <li className="flex justify-between px-4 py-2 text-brand-muted">
          <span>Subtotal</span>
          <span>{formatRM(order.subtotal)}</span>
        </li>
        <li className="flex justify-between px-4 py-2 text-brand-muted">
          <span>Service fee</span>
          <span>{formatRM(order.serviceFee)}</span>
        </li>
        <li className="flex justify-between px-4 py-3 font-semibold">
          <span>Total</span>
          <span data-testid="total">{formatRM(order.total)}</span>
        </li>
      </ul>

      {isPending && (
        <div className="mt-6">
          {payError && (
            <p role="alert" className="mb-3 rounded-lg bg-red-100 p-3 text-web-caption text-red-800">
              {payError}
            </p>
          )}
          <button
            type="button"
            onClick={handlePay}
            disabled={paying}
            className="min-h-tap w-full rounded-pill bg-brand-yellow px-4 font-semibold text-brand-ink disabled:cursor-not-allowed disabled:bg-brand-soft disabled:text-brand-muted"
          >
            {paying ? "Starting payment…" : `Pay ${formatRM(order.total)}`}
          </button>
        </div>
      )}

      {DONE.has(order.status) && (
        <Link href={menuHref} className="mt-6 inline-flex min-h-tap items-center text-brand-teal underline">
          Order something else
        </Link>
      )}
    </main>
  );
}
