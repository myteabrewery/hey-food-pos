import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import { useCart } from "../cart/cart-context";

/**
 * Persistent cart bar — docs/customer-app-screens-v2.md Section 5. Fixed
 * above the bottom tab bar via TabScreenShell, which renders this at the
 * bottom of each tab screen's own content area — already just above the
 * native tab bar within a tab navigator, so no absolute-positioning or
 * tab-bar-height calculation is needed. Renders nothing when the cart is
 * empty.
 */
export function CartBar() {
  const cart = useCart();
  const router = useRouter();

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  if (itemCount === 0) {
    return null;
  }

  return (
    <View style={styles.bar}>
      <View>
        <Text style={styles.itemCount}>
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </Text>
        <Text style={styles.total}>RM{cart.subtotal.toFixed(2)}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.viewCartButton, pressed && styles.viewCartButtonPressed]}
        onPress={() => router.push("/cart-modal")}
        accessibilityRole="button"
        accessibilityLabel="View cart"
      >
        <Text style={styles.viewCartButtonText}>View cart →</Text>
      </Pressable>
    </View>
  );
}

const customerSpacing = SPACING_BY_APP.customer;

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BRAND_COLORS.navy,
    paddingHorizontal: customerSpacing.cardPaddingPx,
    paddingVertical: SPACING_SCALE[2], // 12px
  },
  itemCount: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "400",
    color: BRAND_COLORS.onNavyMuted,
  },
  total: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.white,
  },
  viewCartButton: {
    backgroundColor: BRAND_COLORS.yellow,
    borderRadius: RADIUS.pill,
    paddingHorizontal: customerSpacing.cardPaddingPx,
    paddingVertical: SPACING_SCALE[1], // 8px
  },
  // Generic press-dim — no "yellowDark" token exists or was requested.
  viewCartButtonPressed: {
    opacity: 0.85,
  },
  viewCartButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
});
