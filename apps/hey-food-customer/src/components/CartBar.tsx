import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  if (itemCount === 0) {
    return null;
  }

  return (
    <View style={styles.bar}>
      <View>
        {/* Singular/plural key picked here, NOT via i18next's `count` plural
            lookup: i18n/index.ts runs compatibilityJSON "v3" (v3 looks for
            `_plural`, so the `_one`/`_other` keys never resolve and the raw
            key text renders), and dropping v3 would silently fall back to
            v3 handling anyway on any device without Intl.PluralRules.
            Explicit keys work under either, and a language with one plural
            form (ms, zh) just fills both keys with the same text. */}
        <Text style={styles.itemCount}>
          {t(itemCount === 1 ? "cartBar.itemCount_one" : "cartBar.itemCount_other", { count: itemCount })}
        </Text>
        <Text style={styles.total}>RM{cart.subtotal.toFixed(2)}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.viewCartButton, pressed && styles.viewCartButtonPressed]}
        onPress={() => router.push("/cart-modal")}
        accessibilityRole="button"
        accessibilityLabel={t("cartBar.viewCartAccessibilityLabel")}
      >
        <Text style={styles.viewCartButtonText}>{t("cartBar.viewCart")}</Text>
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
