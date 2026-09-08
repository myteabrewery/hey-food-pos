import { Stack } from "expo-router";

import { CartProvider } from "../cart/cart-context";
import { SelectedOutletProvider } from "../outlet/selected-outlet-context";

/**
 * Screens build their own custom headers per docs/customer-app-screens-
 * v1.md (e.g. Menu's "ORDERING FROM" header) — the native stack header
 * chrome is hidden everywhere rather than fought screen by screen.
 *
 * The (tabs) group is the main app (docs/customer-app-screens-v2.md
 * Section 2); cart-modal is a root-level sibling route presented as a
 * transparent modal so it overlays the tabs rather than replacing them —
 * see app/cart-modal.tsx for the bottom-sheet implementation itself.
 */
export default function RootLayout() {
  return (
    <SelectedOutletProvider>
      <CartProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="cart-modal"
            options={{ presentation: "transparentModal", animation: "fade" }}
          />
        </Stack>
      </CartProvider>
    </SelectedOutletProvider>
  );
}
