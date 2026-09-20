"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactElement } from "react";

import type { CreateGuestOrderRequest } from "@hey-food/api-client";
import { normalizeMalaysianMobile } from "@hey-food/api-client";

import { useCart } from "@/cart/cart-context";
import { formatRM } from "@/lib/format";
import { ApiRequestError, createGuestOrder } from "@/lib/guest-api";
import { saveGuestToken } from "@/lib/guest-session";

/**
 * Guest checkout, step 1: confirm the cart and give a phone number, which is
 * the order's only identity. "Continue to payment" creates the order
 * (`POST /guest/orders`, status `pending`) and lands on the order page, where
 * the guest sees the SERVER's real total — including the service fee, and any
 * price that changed since they loaded the menu — before paying.
 */
export default function CheckoutPage({ params }: { params: { outletId: string } }): ReactElement {
  const router = useRouter();
  const cart = useCart();
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One Idempotency-Key per distinct request: a retry of the SAME cart+phone
  // (flaky network, second tap) reuses it so the backend returns the same
  // order; changing the cart or phone mints a new one (the backend rejects a
  // key reused with a different body).
  const idempotency = useRef<{ fingerprint: string; key: string } | null>(null);

  const menuHref = `/o/${encodeURIComponent(params.outletId)}`;
  const normalizedPhone = normalizeMalaysianMobile(phone);
  const phoneError =
    phoneTouched && normalizedPhone === null ? "Enter a valid Malaysian mobile number, e.g. 012-345 6789." : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPhoneTouched(true);
    if (submitting || normalizedPhone === null || cart.lines.length === 0) return;

    const body: CreateGuestOrderRequest = {
      outletId: params.outletId,
      guestPhone: phone,
      items: cart.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        selectedModifierOptions: line.modifiers.map((m) => ({ optionId: m.optionId, quantity: m.quantity })),
      })),
    };
    const fingerprint = JSON.stringify(body);
    if (idempotency.current?.fingerprint !== fingerprint) {
      idempotency.current = { fingerprint, key: crypto.randomUUID() };
    }

    setSubmitting(true);
    setError(null);
    try {
      const order = await createGuestOrder(body, idempotency.current.key);
      saveGuestToken(order.id, order.guestToken);
      router.replace(`/o/${encodeURIComponent(params.outletId)}/order/${encodeURIComponent(order.id)}`);
      // The order now exists server-side; the cart has done its job. Left
      // submitting=true so the button stays locked while the page changes.
      cart.clear();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (cart.lines.length === 0 && !submitting) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-web-heading font-semibold">Your cart is empty</h1>
        <Link href={menuHref} className="mt-4 inline-flex min-h-tap items-center text-brand-teal underline">
          Back to the menu
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-10 pt-6">
      <Link href={menuHref} className="inline-flex min-h-tap items-center text-brand-teal">
        ← Back to menu
      </Link>
      <h1 className="mb-4 mt-2 text-web-display font-semibold">Checkout</h1>

      <ul className="divide-y divide-brand-line overflow-hidden rounded-lg border border-brand-line bg-brand-white">
        {cart.lines.map((line) => (
          <li key={line.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">
                {line.quantity} × {line.name}
              </p>
              {line.modifiers.length > 0 && (
                <p className="text-web-caption text-brand-muted">
                  {line.modifiers.map((m) => (m.quantity > 1 ? `${m.quantity}× ${m.optionName}` : m.optionName)).join(", ")}
                </p>
              )}
            </div>
            <span className="shrink-0">{formatRM(line.unitPrice * line.quantity)}</span>
          </li>
        ))}
        <li className="flex justify-between px-4 py-3 font-semibold">
          <span>Subtotal</span>
          <span>{formatRM(cart.subtotal)}</span>
        </li>
      </ul>
      <p className="mt-2 text-web-caption text-brand-muted">
        A service fee is added when you continue; you&apos;ll see the exact total before you pay.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="guest-phone" className="mb-1 block font-semibold">
            Mobile number
          </label>
          <input
            id="guest-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="012-345 6789"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            onBlur={() => setPhoneTouched(true)}
            aria-invalid={phoneError !== null}
            aria-describedby="guest-phone-help"
            className="min-h-tap w-full rounded-lg border border-brand-line bg-brand-white px-4"
          />
          <p id="guest-phone-help" className={`mt-1 text-web-caption ${phoneError ? "text-red-800" : "text-brand-muted"}`}>
            {phoneError ?? "Identifies your order at the counter. No account needed."}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-100 p-3 text-web-caption text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-tap w-full rounded-pill bg-brand-yellow px-4 font-semibold text-brand-ink disabled:cursor-not-allowed disabled:bg-brand-soft disabled:text-brand-muted"
        >
          {submitting ? "Placing your order…" : "Continue to payment"}
        </button>
      </form>
    </main>
  );
}
