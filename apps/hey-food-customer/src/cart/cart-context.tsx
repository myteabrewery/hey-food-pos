import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { ResolvedMenuItem } from "@hey-food/shared-types";

/**
 * Local cart line item — display-shaped (carries name/price for rendering
 * Checkout), not the wire shape. When actually submitting an order, this
 * gets mapped down to api-client's CreateOrderItemInput (productId,
 * quantity, notes only) — price is never sent, since the real contract
 * computes it server-side from the current resolved menu (api-client's
 * orders.ts).
 */
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  /** Always undefined for now — no product customization screen exists yet to collect this. */
  notes?: string;
}

export interface CartOutlet {
  id: string;
  name: string;
}

interface CartContextValue {
  outlet: CartOutlet | null;
  items: CartItem[];
  subtotal: number;
  addItem: (outlet: CartOutlet, product: ResolvedMenuItem) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

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

  const addItem = useCallback((nextOutlet: CartOutlet, product: ResolvedMenuItem) => {
    setOutlet(nextOutlet);
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  }, []);

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
