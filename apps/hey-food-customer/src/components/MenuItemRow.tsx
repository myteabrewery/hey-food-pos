import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ResolvedMenuItem } from "@hey-food/shared-types";
import { BRAND_COLORS, FONT_FAMILY, MENU_ITEM_TITLE_PX, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

export interface MenuItemRowProps {
  item: ResolvedMenuItem;
  onAdd: (item: ResolvedMenuItem) => void;
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
 */
export function MenuItemRow({ item, onAdd }: MenuItemRowProps) {
  const isSoldOut = !item.isAvailable;

  return (
    <View style={[styles.row, isSoldOut && styles.rowSoldOut]}>
      <View
        style={[
          styles.imageContainer,
          { backgroundColor: isSoldOut ? BRAND_COLORS.neutral100 : BRAND_COLORS.emberTint },
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
            onPress={() => onAdd(item)}
            hitSlop={ADD_BUTTON_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.name}`}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const customerSpacing = SPACING_BY_APP.customer;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: customerSpacing.cardPaddingPx,
  },
  rowSoldOut: {
    opacity: 0.5,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: RADIUS.imageThumbnail,
  },
  details: {
    flex: 1,
    gap: SPACING_SCALE[0], // 4px
  },
  name: {
    fontFamily: FONT_FAMILY,
    fontSize: MENU_ITEM_TITLE_PX,
    fontWeight: "600",
    color: BRAND_COLORS.char900,
  },
  description: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "400",
    color: BRAND_COLORS.char400,
  },
  trailing: {
    alignItems: "flex-end",
    gap: SPACING_SCALE[1], // 8px
  },
  price: {
    fontFamily: FONT_FAMILY,
    fontSize: MENU_ITEM_TITLE_PX,
    fontWeight: "700",
    color: BRAND_COLORS.char900,
  },
  addButton: {
    width: ADD_BUTTON_SIZE,
    height: ADD_BUTTON_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: BRAND_COLORS.ember500,
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
