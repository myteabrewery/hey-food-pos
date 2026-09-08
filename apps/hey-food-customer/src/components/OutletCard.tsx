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
 * Outlet card for the Home screen — dev spec Section 4.1: when exactly one
 * outlet is in range, show it directly with "Order Now" as the primary
 * CTA, no outlet-choice step.
 *
 * Content is still element-for-element per docs/customer-app-screens-v1.md
 * (name, address, open/closed status, button) — distance still isn't
 * shown here, per that doc.
 *
 * Visual treatment per docs/customer-app-screens-v2.md Section 3.5: this
 * is now a standard white section card (was V1's Ember-tint hero card).
 * v2 explicitly demotes this from hero treatment since the new hero slot
 * on Home belongs to a separate marketing card — that composite screen
 * doesn't exist yet, so this component keeps its current standalone
 * shape/props for now and only the card chrome changes here.
 */
export function OutletCard({ outlet, onPressOrderNow }: OutletCardProps) {
  const isOpen = outlet.status === "open";

  return (
    <View style={[styles.card, !isOpen && styles.cardClosed]}>
      <View style={styles.nearRow}>
        <MaterialCommunityIcons name="map-marker" size={12} color={BRAND_COLORS.teal} />
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
  // Standard white card + line border (v2 §3.5), not the old hero-card
  // fill. Radius moved from `lg` (design-tokens: "hero cards, modals") to
  // `md` ("standard cards") to match the demotion in kind, not just
  // color — a judgment call since v2 doesn't give this card's radius
  // explicitly. No shadow/elevation added: v2 doesn't specify one for
  // this card, and inventing a shadowRadius/shadowOpacity value isn't a
  // mechanical palette swap — flagging rather than guessing.
  card: {
    backgroundColor: BRAND_COLORS.white,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: RADIUS.md,
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
    color: BRAND_COLORS.teal,
  },
  name: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
    marginTop: SPACING_SCALE[1], // 8px
  },
  address: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
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
    backgroundColor: BRAND_COLORS.teal,
    borderRadius: RADIUS.md,
    minHeight: MIN_TAP_TARGET_PX.customer,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: customerSpacing.cardPaddingPx,
    paddingVertical: SPACING_SCALE[2], // 12px
    marginTop: customerSpacing.elementGapPx,
  },
  // tealDark is the pressed/active state for teal buttons (design-tokens colors.ts).
  orderButtonPressed: {
    backgroundColor: BRAND_COLORS.tealDark,
  },
  orderButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.white,
  },
});
