"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "@/cart/cart-context";
import { formatRM } from "@/lib/format";

/**
 * Persistent bottom bar once the cart has items, leading to the checkout
 * page. Hidden on the checkout and order pages themselves, which show the
 * cart/order in full.
 */
export function CartBar() {
  const { outletId, lines, itemCount, subtotal, removeLine } = useCart();
  const pathname = usePathname();

  if (itemCount === 0 || /\/(checkout|order)(\/|$)/.test(pathname)) {
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
        <Link
          href={`/o/${encodeURIComponent(outletId)}/checkout`}
          className="mt-2 flex min-h-tap w-full items-center justify-center rounded-pill bg-brand-yellow px-4 font-semibold text-brand-ink"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
