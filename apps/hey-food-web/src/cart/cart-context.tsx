"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

/**
 * Display-only snapshot of a customized item, for showing the cart and
 * building the `POST /guest/orders` body at checkout. The order request only
 * ever carries `productId`, `quantity` and `{ optionId, quantity }` pairs —
 * never a price; every price here is for display and the server recomputes
 * the real charge. Same "never trust client-computed price" rule as the
 * Customer App's cart.
 */
export interface CartModifier {
  optionId: string;
  groupName: string;
  optionName: string;
  priceDelta: number;
  quantity: number;
}

export interface CartLine {
  id: string;
  productId: string;
  name: string;
  /** Item price with modifier deltas already added, per unit (display only). */
  unitPrice: number;
  quantity: number;
  modifiers: CartModifier[];
}

interface CartContextValue {
  outletId: string;
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addLine: (line: Omit<CartLine, "id">) => void;
  removeLine: (id: string) => void;
  /** Empties the cart (after an order has been created from it). */
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// --- Storage -------------------------------------------------------------
// sessionStorage, not localStorage: a guest's cart shouldn't outlive the
// tab, and it's keyed per outlet since a QR code is scoped to one outlet.
// The cart is modelled as an external store read through
// useSyncExternalStore: that hook renders the server snapshot ("[]") during
// hydration and switches to the real stored cart right after, so there's no
// hydration mismatch and no setState-in-effect.
//
// `memory` backs the store when sessionStorage is blocked (private mode,
// strict site-data settings): the cart then still works for the life of the
// page, it just doesn't survive a reload.

const EMPTY_SNAPSHOT = "[]";
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

const storageKey = (outletId: string) => `hey-food-web:cart:${outletId}`;

function readRaw(outletId: string): string {
  try {
    const stored = window.sessionStorage.getItem(storageKey(outletId));
    if (stored !== null) return stored;
  } catch {
    // fall through to memory
  }
  return memory.get(outletId) ?? EMPTY_SNAPSHOT;
}

function writeRaw(outletId: string, raw: string): void {
  memory.set(outletId, raw);
  try {
    window.sessionStorage.setItem(storageKey(outletId), raw);
  } catch {
    // Storage blocked: memory copy above is the source of truth.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function parseLines(raw: string): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

// --- Provider ------------------------------------------------------------

export function CartProvider({ outletId, children }: { outletId: string; children: ReactNode }) {
  // The snapshot is a string, so React's equality check is by value and an
  // unchanged cart never triggers a re-render.
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(outletId),
    () => EMPTY_SNAPSHOT,
  );
  const lines = useMemo(() => parseLines(raw), [raw]);

  const addLine = useCallback(
    (line: Omit<CartLine, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      writeRaw(outletId, JSON.stringify([...parseLines(readRaw(outletId)), { ...line, id }]));
    },
    [outletId],
  );

  const removeLine = useCallback(
    (id: string) => {
      writeRaw(outletId, JSON.stringify(parseLines(readRaw(outletId)).filter((line) => line.id !== id)));
    },
    [outletId],
  );

  const clear = useCallback(() => writeRaw(outletId, EMPTY_SNAPSHOT), [outletId]);

  const value = useMemo<CartContextValue>(
    () => ({
      outletId,
      lines,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
      addLine,
      removeLine,
      clear,
    }),
    [outletId, lines, addLine, removeLine, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
