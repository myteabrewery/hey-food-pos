import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, COMPACT_BODY_PX, FONT_FAMILY, INFO_CARD_PADDING, RADIUS, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

export interface OutletConfirmationBannerProps {
  outletName: string;
}

/**
 * Mandatory, never-omit banner — blueprint's guard against the "customer
 * thinks they're ordering from Outlet A but it's actually Outlet B"
 * failure mode. docs/customer-app-screens-v1.md's Checkout Screen section.
 *
 * The doc's copy is "Outlet name + level" — this app's Outlet type has no
 * "level"/floor field, so only the name renders.
 */
export function OutletConfirmationBanner({ outletName }: OutletConfirmationBannerProps) {
  return (
    <View style={styles.banner}>
      <View style={styles.labelRow}>
        <MaterialCommunityIcons name="map-marker" size={12} color={BRAND_COLORS.teal} />
        <Text style={styles.label}>ORDERING FROM</Text>
      </View>
      <Text style={styles.outletName}>{outletName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // `soft` — no v2 reference equivalent for this element (it's this app's
  // own requirement, not something in the reference mockup), kept as a
  // neutral tinted box rather than left on the retired emberTint.
  banner: {
    backgroundColor: BRAND_COLORS.soft,
    borderRadius: RADIUS.compact,
    paddingVertical: INFO_CARD_PADDING.verticalPx,
    paddingHorizontal: INFO_CARD_PADDING.horizontalPx,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING_SCALE[0], // 4px
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "700",
    color: BRAND_COLORS.teal,
  },
  outletName: {
    fontFamily: FONT_FAMILY,
    fontSize: COMPACT_BODY_PX,
    fontWeight: "600",
    color: BRAND_COLORS.ink,
    marginTop: SPACING_SCALE[0], // 4px
  },
});
