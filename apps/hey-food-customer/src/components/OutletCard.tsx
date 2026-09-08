import { Pressable, StyleSheet, Text, View } from "react-native";

import type { NearbyOutlet } from "@hey-food/api-client";
import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

export interface OutletCardProps {
  outlet: NearbyOutlet;
  onPressOrderNow: () => void;
}

function formatDistance(distanceM: number): string {
  if (distanceM < 1000) {
    return `${Math.round(distanceM)}m away`;
  }
  return `${(distanceM / 1000).toFixed(1)}km away`;
}

/**
 * Hero outlet card for the Home screen — dev spec Section 4.1: when exactly
 * one outlet is in range, show it directly with "Order Now" as the primary
 * CTA, no outlet-choice step.
 *
 * Colors per docs/customer-app-screens-v1.md: the card background is the
 * light Ember tint, not solid Ember 500 — the "Order Now" button is the
 * only element on this card using solid Ember fill + white text, and
 * there's no collision since the tint and the solid fill are visibly
 * distinct.
 */
export function OutletCard({ outlet, onPressOrderNow }: OutletCardProps) {
  const isOpen = outlet.status === "open";

  return (
    <View style={[styles.card, !isOpen && styles.cardClosed]}>
      <Text style={styles.name}>{outlet.name}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{formatDistance(outlet.distanceM)}</Text>
        <Text style={styles.metaDivider}>·</Text>
        <Text style={styles.meta}>{isOpen ? "Open now" : "Closed"}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.orderButton, pressed && styles.orderButtonPressed]}
        onPress={onPressOrderNow}
        disabled={!isOpen}
        accessibilityRole="button"
        accessibilityLabel="Order now"
        accessibilityState={{ disabled: !isOpen }}
      >
        <Text style={styles.orderButtonText}>
          {isOpen ? "Order Now" : "Currently Closed"}
        </Text>
      </Pressable>
    </View>
  );
}

const customerSpacing = SPACING_BY_APP.customer;

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND_COLORS.emberTint,
    borderRadius: RADIUS.lg,
    padding: customerSpacing.cardPaddingPx,
  },
  // Dev spec Section 4.1: closed outlets are shown greyed out, never hidden.
  cardClosed: {
    opacity: 0.6,
  },
  name: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.customer,
    fontWeight: "700",
    color: BRAND_COLORS.char900,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING_SCALE[1], // 8px — name-to-meta gap
  },
  meta: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.char500,
  },
  metaDivider: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    color: BRAND_COLORS.char500,
    marginHorizontal: SPACING_SCALE[0], // 4px
  },
  orderButton: {
    backgroundColor: BRAND_COLORS.ember500,
    borderRadius: RADIUS.md,
    minHeight: MIN_TAP_TARGET_PX.customer,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: customerSpacing.cardPaddingPx,
    paddingVertical: SPACING_SCALE[2], // 12px
    marginTop: customerSpacing.elementGapPx,
  },
  // Ember 600 is the design system's documented pressed/active state for
  // primary actions (design-tokens colors.ts) — no separate white/neutral
  // swap needed now that the button isn't fighting the card background.
  orderButtonPressed: {
    backgroundColor: BRAND_COLORS.ember600,
  },
  orderButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.white,
  },
});
