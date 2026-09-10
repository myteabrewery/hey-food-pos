import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ResolvedMenuItem } from "@hey-food/shared-types";
import { BRAND_COLORS, FONT_FAMILY, MENU_ITEM_TITLE_PX, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

export interface MenuItemRowProps {
  item: ResolvedMenuItem;
  /** Row tap (anywhere but the "+" button) — opens Product Detail (docs/product-customization-v1.md). */
  onPress: (item: ResolvedMenuItem) => void;
  /** "+" tap — adds directly to cart with no modifier selections, skipping Product Detail. */
  onQuickAdd: (item: ResolvedMenuItem) => void;
}

// Fixed component dimensions from the mockup (docs/customer-app-screens-v1.md)
// — not tokenized: these are specific to this one row layout, not a reusable
// scale value like the spacing/radius/color tokens above.
const IMAGE_SIZE = 64;
const ADD_BUTTON_SIZE = 28;

// The mockup's 28px visual size is below design-system-v1.md Section 7's
// 44px minimum tap target for the Customer app. hitSlop extends the actual
// touchable area to exactly 44px without changing the button's visual
// size, reconciling pixel fidelity with the accessibility minimum instead
// of picking one over the other.
const ADD_BUTTON_HIT_SLOP = (MIN_TAP_TARGET_PX.customer - ADD_BUTTON_SIZE) / 2;

/**
 * docs/customer-app-screens-v1.md's sold-out treatment is deliberately not
 * "disabled" styling on an otherwise-normal row — the whole row dims,
 * the description is replaced, and the add button is absent entirely
 * (not present-but-disabled).
 *
 * No real image asset pipeline exists yet — `item.imageUrl` isn't consumed
 * here, the image container is just an empty colored box for now.
 *
 * Quick-add ("+") skips Product Detail entirely EXCEPT when the product
 * has a required modifier group — there's no valid "zero selections" add
 * in that case (docs/product-customization-v1.md's validation rules), so
 * "+" falls back to opening Product Detail too, same as tapping the row.
 * Judgment call: the spec describes "+" as the fast path and the row-tap
 * as the customization path, but doesn't explicitly address this
 * intersection — this is the only way to keep "+" from producing an
 * order that would fail server-side validation.
 */
export function MenuItemRow({ item, onPress, onQuickAdd }: MenuItemRowProps) {
  const isSoldOut = !item.isAvailable;
  const needsCustomization = item.modifierGroups.some((group) => group.required);

  function handleAddPress() {
    if (needsCustomization) {
      onPress(item);
    } else {
      onQuickAdd(item);
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.row, isSoldOut && styles.rowSoldOut, pressed && styles.rowPressed]}
      onPress={() => onPress(item)}
      disabled={isSoldOut}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View
        style={[
          styles.imageContainer,
          { backgroundColor: isSoldOut ? BRAND_COLORS.soft : BRAND_COLORS.peach },
        ]}
      />

      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.description}>
          {isSoldOut ? "Sold out today" : item.description}
        </Text>
      </View>

      <View style={styles.trailing}>
        <Text style={styles.price}>RM{item.price.toFixed(2)}</Text>
        {!isSoldOut && (
          <Pressable
            style={styles.addButton}
            onPress={handleAddPress}
            hitSlop={ADD_BUTTON_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={needsCustomization ? `Customize ${item.name}` : `Add ${item.name}`}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const customerSpacing = SPACING_BY_APP.customer;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: customerSpacing.cardPaddingPx,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowSoldOut: {
    opacity: 0.5,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: RADIUS.compact,
  },
  details: {
    flex: 1,
    gap: SPACING_SCALE[0], // 4px
  },
  name: {
    fontFamily: FONT_FAMILY,
    fontSize: MENU_ITEM_TITLE_PX,
    fontWeight: "600",
    color: BRAND_COLORS.ink,
  },
  description: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
  },
  trailing: {
    alignItems: "flex-end",
    gap: SPACING_SCALE[1], // 8px
  },
  price: {
    fontFamily: FONT_FAMILY,
    fontSize: MENU_ITEM_TITLE_PX,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  addButton: {
    width: ADD_BUTTON_SIZE,
    height: ADD_BUTTON_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: BRAND_COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.white,
  },
});
