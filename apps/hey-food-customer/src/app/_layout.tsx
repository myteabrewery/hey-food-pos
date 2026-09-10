import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
 *
 * SafeAreaProvider wraps everything explicitly (rather than relying on
 * @react-navigation/bottom-tabs' internal SafeAreaProviderCompat
 * fallback) because cart-modal is a sibling of (tabs) at this Stack, not
 * nested inside it — it wouldn't get real inset values from that internal
 * provider otherwise. TabScreenShell is what actually applies the top
 * inset for each tab screen; see its own comment for why that's needed.
 *
 * Every OTHER pushed route at this Stack (product/[id] today; future
 * ones like Checkout/Payment/Order Status) sits outside TabScreenShell's
 * subtree too, so each one needs its own `useSafeAreaInsets()` top-inset
 * handling — see ProductDetailScreen for the pattern (a plain
 * `paddingTop: insets.top` on its header). Deliberately not centralized
 * into a shared wrapper yet: with only one pushed route built so far, the
 * right shared shape (if any) isn't clear — Payment in particular might
 * not even want the same back-button-plus-title header. Revisit once a
 * second pushed route exists and its real layout needs are known, rather
 * than guessing at an abstraction now. Don't forget this on the next
 * pushed screen.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
