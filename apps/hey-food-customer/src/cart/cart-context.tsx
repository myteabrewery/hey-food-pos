import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { ResolvedMenuItem } from "@hey-food/shared-types";

/**
 * One selected modifier option, display-shaped (carries the names needed
 * to render "Spicy, +2x Fish Balls" in the cart) rather than the wire
 * shape — same reasoning as `CartItem` below. Maps down to just
 * `{ optionId, quantity }` when actually submitting an order (api-client's
 * `selectedModifierOptions`); the backend resolves names/price from that
 * ID itself via `validateSelectedModifiers`, never trusting these display
 * fields. `quantity` is always 1 for options where `quantityEnabled` is
 * false — ProductDetailScreen never lets it be anything else for those.
 */
export interface CartItemModifier {
  optionId: string;
  groupName: string;
  optionName: string;
  priceDelta: number;
  quantity: number;
}

/**
 * Local cart line item — display-shaped (carries name/price for rendering
 * Checkout), not the wire shape. When actually submitting an order, this
 * gets mapped down to api-client's CreateOrderItemInput (productId,
 * quantity, notes, selectedModifierOptionIds only) — price is never sent,
 * since the real contract computes it server-side from the current
 * resolved menu (api-client's orders.ts).
 *
 * `price` is the unit price WITH selected modifiers already folded in
 * (base price + sum of their priceDeltas) — CheckoutLineItem and
 * CartBar/cart-context's own `subtotal` just do `price * quantity`
 * unchanged, unaware modifiers are involved at all.
 *
 * `id` identifies one cart *line*, distinct from `productId`: the same
 * product with two different modifier selections (e.g. Chicken Rice/
 * Spicy vs. Chicken Rice/Mild) must stay two separate lines, not merge
 * into one with an incremented quantity — this is what `addItem` keys
 * off instead of `productId` alone.
 */
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: CartItemModifier[];
  /** Always undefined for now — no freeform notes UI exists yet to collect this (distinct from structured `modifiers` above). */
  notes?: string;
}

export interface CartOutlet {
  id: string;
  name: string;
}

export interface AddItemOptions {
  selectedModifiers?: CartItemModifier[];
  quantity?: number;
}

interface CartContextValue {
  outlet: CartOutlet | null;
  items: CartItem[];
  subtotal: number;
  addItem: (outlet: CartOutlet, product: ResolvedMenuItem, options?: AddItemOptions) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Order-independent, so the same modifier set in any selection order still lands on the same cart line. */
function cartLineId(productId: string, selectedModifiers: CartItemModifier[]): string {
  const sortedOptionIds = selectedModifiers.map((modifier) => modifier.optionId).sort();
  return `${productId}::${sortedOptionIds.join(",")}`;
}

/**
 * In-memory only, deliberately — no AsyncStorage/persistence. The cart is
 * lost on app restart or reload; real persistence is a future need, not
 * built here.
 *
 * Scoped to this app only, not a shared package — this is UI-local state
 * shaped around what the Checkout screen needs to render, not a reusable
 * cross-app cart abstraction.
 *
 * `addItem` always overwrites `outlet` to whichever outlet the item came
 * from — there's no "you have items from a different outlet" guard.
 * Given the app only ever has one outlet's menu on screen at a time right
 * now, this can't currently be triggered from the UI, but it's a real gap
 * once a customer can plausibly visit two outlets' menus in one session.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [outlet, setOutlet] = useState<CartOutlet | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback(
    (nextOutlet: CartOutlet, product: ResolvedMenuItem, options?: AddItemOptions) => {
      const selectedModifiers = options?.selectedModifiers ?? [];
      const quantity = options?.quantity ?? 1;
      const lineId = cartLineId(product.id, selectedModifiers);
      const modifiersPriceDelta = selectedModifiers.reduce(
        (sum, modifier) => sum + modifier.priceDelta * modifier.quantity,
        0,
      );

      setOutlet(nextOutlet);
      setItems((prev) => {
        const existing = prev.find((item) => item.id === lineId);
        if (existing) {
          return prev.map((item) =>
            item.id === lineId ? { ...item, quantity: item.quantity + quantity } : item,
          );
        }
        return [
          ...prev,
          {
            id: lineId,
            productId: product.id,
            name: product.name,
            price: product.price + modifiersPriceDelta,
            quantity,
            modifiers: selectedModifiers,
          },
        ];
      });
    },
    [],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({ outlet, items, subtotal, addItem }),
    [outlet, items, subtotal, addItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
