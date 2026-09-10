import { Pressable, StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

export interface QuantityStepperProps {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
}

// No mockup exists for this control (Product Detail is a new screen, per
// docs/product-customization-v1.md) — buttons are sized to the accessibility
// minimum tap target directly, rather than a smaller visual size + hitSlop
// like MenuItemRow's "+" button, since there's no existing pixel spec to
// reconcile against here.
const BUTTON_SIZE = MIN_TAP_TARGET_PX.customer;

/** No upper bound — docs/product-customization-v1.md doesn't specify one ("unless later specified"). */
export function QuantityStepper({ quantity, onChange, min = 1 }: QuantityStepperProps) {
  const atMin = quantity <= min;

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.button, atMin && styles.buttonDisabled]}
        onPress={() => onChange(Math.max(min, quantity - 1))}
        disabled={atMin}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
      >
        <Text style={styles.buttonText}>−</Text>
      </Pressable>
      <Text style={styles.quantity}>{quantity}</Text>
      <Pressable
        style={styles.button}
        onPress={() => onChange(quantity + 1)}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
      >
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING_SCALE[2], // 12px
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: BRAND_COLORS.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  quantity: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
    minWidth: SPACING_SCALE[4], // 24px, keeps the buttons from shifting as digit count changes
    textAlign: "center",
  },
});
