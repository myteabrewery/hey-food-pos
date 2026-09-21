"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";

import { cancelOrderAction } from "@/app/(app)/orders/actions";
import { CANCEL_REASONS } from "@/lib/order-format";

interface Props {
  orderId: string;
  displayId: string;
  status: string;
  paymentKind: "none" | "stub" | "real";
}

type Reason = (typeof CANCEL_REASONS)[number]["value"];

/**
 * HQ's "Cancel this order": a deliberate two-step (open the panel, then confirm),
 * because a cancel cannot be undone here and this app has no login. The panel says,
 * up front, what a cancel does NOT do: no refund, the customer is not told, and the
 * kitchen is not told (the order just leaves the outlet's queue). "Other" needs a
 * description: with no login there is no "who", so the words are the only record of why.
 */
export function CancelOrderPanel({ orderId, displayId, status, paymentKind }: Props): ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | null>(null);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);

  function close() {
    setOpen(false);
    setReason(null);
    setDetail("");
    setError(null);
  }

  async function confirm() {
    if (busy) return;
    if (reason === null) {
      setError({ text: "Pick a reason first.", field: "reason" });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await cancelOrderAction(orderId, { reason, ...(reason === "other" ? { otherDetail: detail } : {}) });
      if (!result.ok) {
        setError({ text: result.error, field: result.field });
        return;
      }
      close();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-md border border-danger-solid bg-danger-tint px-4 text-hq-body font-bold text-danger-solid"
      >
        Cancel this order…
      </button>
    );
  }

  const inFlightWarning =
    status === "received" || status === "preparing"
      ? "The outlet may already be making this. Its tablet is not told: the order just disappears from the queue."
      : status === "ready"
        ? "The customer may already have been told it is ready (and may already be on their way)."
        : null;

  return (
    <div role="group" aria-label={`Cancel order ${displayId}`} className="rounded-md border-2 border-danger-solid bg-brand-white p-4">
      <h3 className="text-hq-heading font-bold text-danger-solid">Cancel order {displayId}?</h3>

      <ul className="mt-2 list-disc pl-5 text-hq-body text-brand-ink">
        <li>The order is marked <strong>Cancelled</strong> everywhere, including on the customer&apos;s own order page. This cannot be undone.</li>
        {inFlightWarning && <li className="font-semibold text-danger-solid">{inFlightWarning}</li>}
        {paymentKind === "real" && (
          <li className="font-semibold text-danger-solid">
            <strong>Nothing is refunded.</strong> This order was paid: the customer stays charged until you refund them by hand.
          </li>
        )}
        {paymentKind === "stub" && <li>It was paid by the payment <strong>stub</strong> (test mode): no money moved, so there is nothing to refund.</li>}
        <li><strong>The customer is not notified.</strong></li>
        <li>It is recorded as cancelled from HQ, with the reason and time, but <strong>not who</strong>: this app has no login.</li>
      </ul>

      <fieldset className="mt-4">
        <legend className="text-hq-body font-semibold text-brand-ink">Reason</legend>
        <div className="mt-1 grid gap-2">
          {CANCEL_REASONS.map((option) => (
            <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-brand-line px-3 text-hq-body text-brand-ink has-[:checked]:border-danger-solid has-[:checked]:bg-danger-tint">
              <input type="radio" name="cancel-reason" value={option.value} checked={reason === option.value} onChange={() => setReason(option.value)} />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {reason === "other" && (
        <div className="mt-3">
          <label htmlFor="cancel-detail" className="text-hq-body font-semibold text-brand-ink">
            Why? (required)
          </label>
          <textarea
            id="cancel-detail"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            rows={2}
            maxLength={200}
            aria-invalid={error?.field === "otherDetail"}
            className="mt-1 w-full rounded-md border border-brand-line bg-brand-white px-3 py-2 text-hq-body text-brand-ink aria-[invalid=true]:border-danger-solid"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-hq-body font-semibold text-danger-solid">
          {error.text.replace(/^otherDetail: /, "")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={busy || reason === null}
          className="min-h-11 rounded-md bg-danger-solid px-5 text-hq-body font-bold text-brand-white disabled:opacity-40"
        >
          {busy ? "Cancelling…" : `Cancel order ${displayId}`}
        </button>
        <button type="button" onClick={close} disabled={busy} className="min-h-11 rounded-md border border-brand-line px-5 text-hq-body font-semibold text-brand-ink">
          Keep the order
        </button>
      </div>
    </div>
  );
}
