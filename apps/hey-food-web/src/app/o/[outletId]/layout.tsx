import type { ReactElement, ReactNode } from "react";

import { CartProvider } from "@/cart/cart-context";
import { CartBar } from "@/components/CartBar";

/**
 * One cart per outlet, shared by the menu and every item page under it —
 * a QR code is scoped to a single outlet, so the cart is too.
 */
export default function OutletLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { outletId: string };
}): ReactElement {
  return (
    <CartProvider outletId={params.outletId}>
      {children}
      <CartBar />
    </CartProvider>
  );
}
