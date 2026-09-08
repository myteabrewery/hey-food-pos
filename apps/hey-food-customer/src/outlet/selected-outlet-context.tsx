import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { NearbyOutlet } from "@hey-food/api-client";

interface SelectedOutletContextValue {
  outlet: NearbyOutlet | null;
  setOutlet: (outlet: NearbyOutlet) => void;
}

const SelectedOutletContext = createContext<SelectedOutletContextValue | null>(null);

/**
 * Which outlet the customer is currently browsing — set once by Home
 * after it resolves the nearest outlet, read by Menu (now a persistent
 * tab, not a screen pushed with an `outletId` route param) so it knows
 * which outlet's menu to show without refetching the nearby list itself.
 *
 * Deliberately separate from cart-context's `outlet` — that one is only
 * set once an item is actually added to a cart. This one reflects "where
 * the customer is currently browsing," which can be set before anything
 * is added (or even before an order is ever placed).
 */
export function SelectedOutletProvider({ children }: { children: ReactNode }) {
  const [outlet, setOutlet] = useState<NearbyOutlet | null>(null);

  const value = useMemo<SelectedOutletContextValue>(() => ({ outlet, setOutlet }), [outlet]);

  return (
    <SelectedOutletContext.Provider value={value}>{children}</SelectedOutletContext.Provider>
  );
}

export function useSelectedOutlet(): SelectedOutletContextValue {
  const context = useContext(SelectedOutletContext);
  if (!context) {
    throw new Error("useSelectedOutlet must be used within a SelectedOutletProvider");
  }
  return context;
}
