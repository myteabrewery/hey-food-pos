"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { ResolvedMenuItem } from "@hey-food/shared-types";
import { areAllGroupsSatisfied, isGroupSatisfied, setOptionQuantity } from "@hey-food/shared-types";

import { ModifierGroupPicker } from "./ModifierGroupPicker";

import { useCart, type CartModifier } from "@/cart/cart-context";
import { formatRM } from "@/lib/format";

interface Props {
  outletId: string;
  item: ResolvedMenuItem;
  /** Outlet is closed: browsing and customizing still work, adding doesn't. */
  ordersOpen: boolean;
}

/**
 * Product customization for the web checkout. Selection state is a plain
 * `optionId -> quantity` map, driven entirely by shared-types'
 * modifier-rules (same rules as the backend's validateSelectedModifiers,
 * agreement checked by a parity test — see docs/STATUS.md). Everything
 * here is a UX gate: the price shown is display-only and the server
 * re-validates and re-prices the order from just option IDs + quantities.
 */
export function ItemCustomizer({ outletId, item, ordersOpen }: Props) {
  const router = useRouter();
  const cart = useCart();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);

  const groups = item.modifierGroups;
  const valid = areAllGroupsSatisfied(groups, selected);
  const unsatisfied = groups.filter((group) => !isGroupSatisfied(group, selected));

  const modifiers = useMemo<CartModifier[]>(
    () =>
      groups.flatMap((group) =>
        group.options
          .filter((option) => (selected[option.id] ?? 0) > 0)
          .map((option) => ({
            optionId: option.id,
            groupName: group.name,
            optionName: option.name,
            priceDelta: option.priceDelta,
            quantity: selected[option.id] ?? 0,
          })),
      ),
    [groups, selected],
  );

  const unitPrice = item.price + modifiers.reduce((sum, m) => sum + m.priceDelta * m.quantity, 0);
  const canAdd = valid && ordersOpen;

  function handleAdd() {
    if (!canAdd) return;
    cart.addLine({ productId: item.id, name: item.name, unitPrice, quantity, modifiers });
    router.push(`/o/${encodeURIComponent(outletId)}`);
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <ModifierGroupPicker
          key={group.id}
          group={group}
          selected={selected}
          onChangeQuantity={(optionId, next) => setSelected((prev) => setOptionQuantity(group, prev, optionId, next))}
        />
      ))}

      <div className="flex items-center justify-between">
        <span className="font-semibold">Quantity</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="min-h-tap min-w-tap rounded-pill border border-brand-teal text-web-heading leading-none text-brand-teal disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-10 text-center font-semibold" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={quantity >= 99}
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            className="min-h-tap min-w-tap rounded-pill bg-brand-teal text-web-heading leading-none text-brand-white disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-brand-line bg-brand-cream px-4 pb-4 pt-3">
        {!ordersOpen && (
          <p className="mb-2 text-center text-web-caption text-brand-muted">
            This outlet is closed, so you can look around but not order right now.
          </p>
        )}
        {ordersOpen && !valid && (
          <p className="mb-2 text-center text-web-caption text-brand-muted">
            Still needed: {unsatisfied.map((group) => group.name).join(", ")}
          </p>
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="min-h-tap w-full rounded-pill bg-brand-yellow px-4 font-semibold text-brand-ink disabled:cursor-not-allowed disabled:bg-brand-soft disabled:text-brand-muted"
        >
          {canAdd ? `Add to cart · ${formatRM(unitPrice * quantity)}` : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
