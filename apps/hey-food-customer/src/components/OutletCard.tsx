import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { NearbyOutlet } from "@hey-food/api-client";
import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, OUTLET_STATUS_COLORS, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

export interface OutletCardProps {
  outlet: NearbyOutlet;
  onPressOrderNow: () => void;
}

// Static placeholder — there's no live prep-time-estimate field on Outlet/
// NearbyOutlet yet. Blueprint Section 4 mentions a "live prep-time estimate
// derived from that outlet's recent average" for the outlet page, which is
// the eventual real source for this; not wired up yet.
const PLACEHOLDER_PREP_TIME = "10-15 min";

/**
 * Hero outlet card for the Home screen — dev spec Section 4.1: when exactly
 * one outlet is in range, show it directly with "Order Now" as the primary
 * CTA, no outlet-choice step.
 *
 * Element-for-element per docs/customer-app-screens-v1.md's Home Screen
 * spec: "YOU'RE NEAR" label, outlet name, address, an open/closed status
 * row, then the button. Distance is NOT shown on this card — per that doc,
 * distance only appears in the separate "Other nearby outlets" list, which
 * this pass doesn't build (only the single hero card was in scope).
 */
export function OutletCard({ outlet, onPressOrderNow }: OutletCardProps) {
  const isOpen = outlet.status === "open";

  return (
    <View style={[styles.card, !isOpen && styles.cardClosed]}>
      <View style={styles.nearRow}>
        <MaterialCommunityIcons name="map-marker" size={12} color={BRAND_COLORS.ember600} />
        <Text style={styles.nearLabel}>{"YOU'RE NEAR"}</Text>
      </View>

      <Text style={styles.name}>{outlet.name}</Text>
      <Text style={styles.address}>{outlet.address}</Text>

      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>
          {isOpen ? `Open · ${PLACEHOLDER_PREP_TIME}` : "Closed"}
        </Text>
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
  // Dev spec Section 4.1 / customer-app-screens-v1.md: closed outlets are
  // shown greyed out (reduced opacity on the whole card), never hidden —
  // no separate closed-state color is introduced.
  cardClosed: {
    opacity: 0.5,
  },
  nearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING_SCALE[0], // 4px between icon and label
  },
  nearLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "600",
    color: BRAND_COLORS.emberTintText,
  },
  name: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.customer,
    fontWeight: "700",
    color: BRAND_COLORS.char900,
    marginTop: SPACING_SCALE[1], // 8px
  },
  address: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.char500,
    marginTop: SPACING_SCALE[0], // 4px
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING_SCALE[0], // 4px between dot and text
    marginTop: SPACING_SCALE[1], // 8px
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: OUTLET_STATUS_COLORS.open,
  },
  statusText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "600",
    color: OUTLET_STATUS_COLORS.open,
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
  // primary actions (design-tokens colors.ts).
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
