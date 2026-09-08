import { StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, COMPACT_BODY_PX, FONT_FAMILY, INFO_CARD_PADDING, RADIUS, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

export interface TotalsBlockProps {
  subtotal: number;
  serviceFee: number;
  total: number;
}

/**
 * docs/customer-app-screens-v1.md's Checkout "Totals block" spec — also
 * explicitly reused, per that doc, as Order Status's "Order summary
 * block: same visual treatment as Checkout's totals block". Extracted as
 * its own component now rather than inlined in CheckoutScreen, since that
 * reuse is already confirmed, not speculative.
 */
export function TotalsBlock({ subtotal, serviceFee, total }: TotalsBlockProps) {
  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <Text style={styles.label}>Subtotal</Text>
        <Text style={styles.value}>RM{subtotal.toFixed(2)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Service fee</Text>
        <Text style={styles.value}>RM{serviceFee.toFixed(2)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>RM{total.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: BRAND_COLORS.soft,
    borderRadius: RADIUS.md,
    paddingVertical: INFO_CARD_PADDING.verticalPx,
    paddingHorizontal: INFO_CARD_PADDING.horizontalPx,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SPACING_SCALE[0], // 4px
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: COMPACT_BODY_PX,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
  },
  value: {
    fontFamily: FONT_FAMILY,
    fontSize: COMPACT_BODY_PX,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
  },
  // Was a thin backgroundColor-filled box standing in for a border — same
  // mismatch as CheckoutScreen's itemDivider (a border role using a
  // background token), fixed here too since it's the identical pattern,
  // not something specifically called out separately.
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BRAND_COLORS.line,
    marginVertical: SPACING_SCALE[1], // 8px
  },
  totalLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  totalValue: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
});
