import { Stack } from "expo-router";

import { CartProvider } from "../cart/cart-context";

// Screens build their own custom headers per docs/customer-app-screens-v1.md
// (e.g. Menu's "ORDERING FROM" header) — the native stack header chrome is
// hidden everywhere rather than fought screen by screen.
export default function RootLayout() {
  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </CartProvider>
  );
}
