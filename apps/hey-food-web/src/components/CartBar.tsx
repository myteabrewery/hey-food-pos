"use client";

import { useCart } from "@/cart/cart-context";
import { formatRM } from "@/lib/format";

/**
 * Persistent bottom bar once the cart has items. The checkout action is a
 * deliberate, visible STUB: guest checkout's order submission (Stage 5:
 * POST /guest/orders, Billplz) doesn't exist yet, so there's nothing for
 * this button to do. Shown disabled and labelled rather than wired to
 * something fake.
 */
export function CartBar() {
  const { lines, itemCount, subtotal, removeLine } = useCart();

  if (itemCount === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-brand-line bg-brand-navy text-brand-white shadow-lg">
      <div className="mx-auto max-w-2xl px-4 py-3">
        <details className="group">
          <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between gap-3">
            <span className="font-semibold">
              {itemCount} {itemCount === 1 ? "item" : "items"} · {formatRM(subtotal)}
            </span>
            <span className="text-web-caption text-brand-onNavyMuted group-open:hidden">View cart</span>
            <span className="hidden text-web-caption text-brand-onNavyMuted group-open:inline">Hide</span>
          </summary>
          <ul className="mt-2 max-h-56 divide-y divide-white/10 overflow-y-auto">
            {lines.map((line) => (
              <li key={line.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {line.quantity} × {line.name}
                  </p>
                  {line.modifiers.length > 0 && (
                    <p className="text-web-caption text-brand-onNavyMuted">
                      {line.modifiers
                        .map((m) => (m.quantity > 1 ? `${m.quantity}× ${m.optionName}` : m.optionName))
                        .join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span>{formatRM(line.unitPrice * line.quantity)}</span>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="min-h-tap min-w-tap text-web-caption text-brand-onNavyMuted underline"
                    aria-label={`Remove ${line.name} from cart`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </details>
        <button
          type="button"
          disabled
          className="mt-2 min-h-tap w-full cursor-not-allowed rounded-pill bg-white/15 px-4 text-brand-onNavyMuted"
        >
          Checkout: coming soon
        </button>
      </div>
    </div>
  );
}
