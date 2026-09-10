import { StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, COMPACT_BODY_PX, FONT_FAMILY, TINY_LABEL_PX } from "@hey-food/design-tokens";

import type { CartItem, CartItemModifier } from "../cart/cart-context";

export interface CheckoutLineItemProps {
  item: CartItem;
}

/**
 * "Spicy, +Extra Egg" per docs/product-customization-v1.md's cart-display
 * note — a "+" prefix marks options that actually add to the price
 * (priceDelta > 0); zero-cost selections (e.g. a spice level) show plain.
 */
function formatModifiers(modifiers: CartItemModifier[]): string {
  return modifiers
    .map((modifier) => (modifier.priceDelta > 0 ? `+${modifier.optionName}` : modifier.optionName))
    .join(", ");
}

/**
 * docs/customer-app-screens-v1.md's Checkout Screen "Line items" spec:
 * name 13px/weight 600, modifier note 11px muted, price 13px/weight 600.
 * The "modifier note" slot already anticipated in that spec (see
 * design-tokens' TINY_LABEL_PX doc comment) is reused here for the
 * selected-modifiers summary — a separate concern from `item.notes`
 * (freeform text), which still renders in its own line below when present.
 */
export function CheckoutLineItem({ item }: CheckoutLineItemProps) {
  const label = item.quantity > 1 ? `${item.quantity}× ${item.name}` : item.name;
  const modifiersSummary = item.modifiers.length > 0 ? formatModifiers(item.modifiers) : null;

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{label}</Text>
        {modifiersSummary && <Text style={styles.note}>{modifiersSummary}</Text>}
        {item.notes && <Text style={styles.note}>{item.notes}</Text>}
      </View>
      <Text style={styles.price}>RM{(item.price * item.quantity).toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: FONT_FAMILY,
    fontSize: COMPACT_BODY_PX,
    fontWeight: "600",
    color: BRAND_COLORS.ink,
  },
  note: {
    fontFamily: FONT_FAMILY,
    fontSize: TINY_LABEL_PX,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
  },
  price: {
    fontFamily: FONT_FAMILY,
    fontSize: COMPACT_BODY_PX,
    fontWeight: "600",
    color: BRAND_COLORS.ink,
  },
});
