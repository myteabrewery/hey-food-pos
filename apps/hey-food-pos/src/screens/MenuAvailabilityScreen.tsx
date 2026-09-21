import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  BRAND_COLORS,
  DANGER_COLORS,
  FONT_FAMILY,
  MIN_TAP_TARGET_PX,
  RADIUS,
  SPACING_BY_APP,
  SPACING_SCALE,
  TYPE_SCALE,
} from "@hey-food/design-tokens";

import type { MenuItem } from "../api/menu";
import type { MenuLoadState } from "../menu/useMenuAvailability";

export interface MenuAvailabilityScreenProps {
  items: MenuItem[];
  state: MenuLoadState;
  loadError: string | null;
  /** Set a product to the given availability (the DESIRED state, not a flip). */
  onSetAvailability: (item: MenuItem, isAvailable: boolean) => void;
  onRetry: () => void;
}

/**
 * Menu Availability (docs/hey-food-developer-spec-v1.md Section 5.3) —
 * writes to `OutletProductOverride.isAvailable` only. Section 5.3 is
 * explicit that staff can toggle availability but never price: there is no
 * price-editing affordance here at all, by design, and the request that saves
 * a toggle has no price field (the API rejects one).
 *
 * The list is the outlet's real menu, and each toggle is saved to the server
 * (optimistic, rolled back with a banner on failure — see useMenuAvailability).
 * The price shown is what customers are charged at THIS outlet (master price or
 * its HQ override), not the master price.
 *
 * Toggle judgment call: a single full-width button per product, whose
 * label/color IS the current state ("AVAILABLE" teal / "SOLD OUT" ink)
 * and which flips that state on tap — not a native OS-style Switch,
 * which would look inconsistent with every other button in this app,
 * and not a two-button segmented control, which would just be the same
 * information rendered twice. Ink (not a new red/error color) for "sold
 * out": reads as "off" against teal's "on" using only colors already in
 * design-tokens, without implying something alarming happened. The flip is
 * computed HERE from what is on screen and sent as an explicit desired state.
 */
export function MenuAvailabilityScreen({ items, state, loadError, onSetAvailability, onRetry }: MenuAvailabilityScreenProps) {
  if (state === "loading") {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Loading menu…</Text>
      </View>
    );
  }

  if (state === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>{`Couldn't load the menu: ${loadError ?? "unknown error"}`}</Text>
        <Pressable style={styles.retryButton} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading the menu">
          <Text style={styles.retryText}>RETRY</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {loadError !== null && (
        <View style={styles.staleStrip} accessibilityRole="alert">
          <Text style={styles.staleText}>{`Couldn't refresh the menu (${loadError}) — showing what was last loaded.`}</Text>
        </View>
      )}

      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.info}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productMeta}>
              {item.category} · RM{item.price.toFixed(2)}
            </Text>
          </View>

          <Pressable
            style={[styles.toggleButton, item.isAvailable ? styles.toggleAvailable : styles.toggleSoldOut]}
            onPress={() => onSetAvailability(item, !item.isAvailable)}
            accessibilityRole="button"
            accessibilityState={{ selected: item.isAvailable }}
            accessibilityLabel={`${item.name}: ${item.isAvailable ? "available" : "sold out"}, tap to toggle`}
          >
            <Text style={styles.toggleButtonText}>{item.isAvailable ? "AVAILABLE" : "SOLD OUT"}</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const posSpacing = SPACING_BY_APP.pos;

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: posSpacing.tapPaddingPx,
    padding: posSpacing.tapPaddingPx,
  },
  message: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "600",
    color: BRAND_COLORS.onNavyMuted,
    textAlign: "center",
  },
  retryButton: {
    minWidth: 150,
    minHeight: MIN_TAP_TARGET_PX.pos,
    borderRadius: RADIUS.md,
    backgroundColor: BRAND_COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING_SCALE[2], // 12px
  },
  retryText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    letterSpacing: 0.5,
  },
  staleStrip: {
    backgroundColor: DANGER_COLORS.tint,
    borderRadius: RADIUS.sm,
    padding: SPACING_SCALE[2], // 12px
  },
  staleText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "700",
    color: DANGER_COLORS.solid,
  },
  list: {
    padding: posSpacing.tapPaddingPx,
    gap: posSpacing.queueCardGapPx,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: posSpacing.tapPaddingPx,
    backgroundColor: BRAND_COLORS.white,
    borderRadius: RADIUS.sm,
    padding: posSpacing.tapPaddingPx,
  },
  info: {
    flex: 1,
    gap: SPACING_SCALE[0], // 4px
  },
  productName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "800",
    color: BRAND_COLORS.ink,
  },
  productMeta: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "600",
    color: BRAND_COLORS.muted,
  },
  toggleButton: {
    minWidth: 150,
    minHeight: MIN_TAP_TARGET_PX.pos,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING_SCALE[2], // 12px
  },
  toggleAvailable: {
    backgroundColor: BRAND_COLORS.teal,
  },
  toggleSoldOut: {
    backgroundColor: BRAND_COLORS.ink,
  },
  toggleButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    letterSpacing: 0.5,
  },
});
