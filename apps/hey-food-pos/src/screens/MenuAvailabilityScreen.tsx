import type { Dispatch, SetStateAction } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { OutletProductOverride, Product } from "@hey-food/shared-types";
import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

export interface MenuAvailabilityScreenProps {
  products: Product[];
  overrides: OutletProductOverride[];
  onChangeOverrides: Dispatch<SetStateAction<OutletProductOverride[]>>;
}

/**
 * Menu Availability (docs/hey-food-developer-spec-v1.md Section 5.3) —
 * writes to `OutletProductOverride.isAvailable` only. Section 5.3 is
 * explicit that staff can toggle availability but never price, even
 * though the same `OutletProductOverride` type also carries
 * `priceOverride` — no price-editing affordance exists here at all, by
 * design, not by omission.
 *
 * STUB DATA: `overrides` is owned by PosShell (mock/products.ts's
 * initial state, one row per product) — there's no
 * `PATCH /pos/outlets/:id/products/:productId/availability` endpoint on
 * the backend yet, so toggling only ever updates this local mock list.
 *
 * Toggle judgment call: a single full-width button per product, whose
 * label/color IS the current state ("AVAILABLE" teal / "SOLD OUT" ink)
 * and which flips that state on tap — not a native OS-style Switch,
 * which would look inconsistent with every other button in this app,
 * and not a two-button segmented control, which would just be the same
 * information rendered twice. Ink (not a new red/error color) for "sold
 * out": reads as "off" against teal's "on" using only colors already in
 * design-tokens, without implying something alarming happened.
 */
export function MenuAvailabilityScreen({ products, overrides, onChangeOverrides }: MenuAvailabilityScreenProps) {
  const overrideByProductId = new Map(overrides.map((override) => [override.productId, override]));

  function handleToggle(productId: string) {
    onChangeOverrides((prev) =>
      prev.map((override) =>
        override.productId === productId ? { ...override, isAvailable: !override.isAvailable } : override,
      ),
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {products.map((product) => {
        const override = overrideByProductId.get(product.id);
        const isAvailable = override?.isAvailable ?? true;

        return (
          <View key={product.id} style={styles.card}>
            <View style={styles.info}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productMeta}>
                {product.category} · RM{product.masterPrice.toFixed(2)}
              </Text>
            </View>

            <Pressable
              style={[styles.toggleButton, isAvailable ? styles.toggleAvailable : styles.toggleSoldOut]}
              onPress={() => handleToggle(product.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isAvailable }}
              accessibilityLabel={`${product.name}: ${isAvailable ? "available" : "sold out"}, tap to toggle`}
            >
              <Text style={styles.toggleButtonText}>{isAvailable ? "AVAILABLE" : "SOLD OUT"}</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const posSpacing = SPACING_BY_APP.pos;

const styles = StyleSheet.create({
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
