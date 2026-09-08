import { StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, COMPACT_BODY_PX, FONT_FAMILY, TINY_LABEL_PX } from "@hey-food/design-tokens";

import type { CartItem } from "../cart/cart-context";

export interface CheckoutLineItemProps {
  item: CartItem;
}

/** docs/customer-app-screens-v1.md's Checkout Screen "Line items" spec. */
export function CheckoutLineItem({ item }: CheckoutLineItemProps) {
  const label = item.quantity > 1 ? `${item.quantity}× ${item.name}` : item.name;

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{label}</Text>
        {/* item.notes is always undefined for now — no product customization screen exists yet to collect it. */}
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
