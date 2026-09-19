import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import type { OrderItem } from "@hey-food/shared-types";
import { BRAND_COLORS, FONT_FAMILY, RADIUS, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import { groupModifiers } from "../orders/format";

export interface OrderItemLineProps {
  item: OrderItem;
}

// Quantity gutter — wide enough for "99×" at heading size, so item names and
// option names always start on the same vertical line whatever the count.
const QUANTITY_GUTTER_WIDTH = 44;
// An option's own quantity gutter sits inside the modifier block's 12px left
// padding, so it's narrower by that amount and option names still line up
// under the item name above.
const OPTION_QUANTITY_WIDTH = 32;
// Nudges the small group label down to sit level with the first option
// line's much larger text.
const LABEL_OPTICAL_OFFSET_PX = 2;

// Modifier group labels sit BESIDE their options from this width up (tablet
// landscape, the real POS target) and ABOVE them below it (phones, where a
// side-by-side label column would squeeze option names into wrapping).
const SIDE_LABEL_MIN_WIDTH = 700;
const SIDE_LABEL_COLUMN_WIDTH = 132;

/**
 * One line item on the Order Detail screen — the core of that screen: staff
 * must be able to read exactly what to prepare.
 *
 * Layout, top to bottom:
 * - "2× DIY Soup Bowl" — quantity in a fixed gutter, name in heading weight.
 * - (only when quantity > 1 AND there are modifiers) an "Applies to each of
 *   the N" line. Modifiers belong to the ONE line item, so "Fish Balls ×2"
 *   on "2× DIY Soup Bowl" means two per bowl, not two in total — an easy
 *   misread on a busy shift, so it's spelled out.
 * - One block per modifier group (Soup Base / Ingredients / Carb Base, in
 *   the order the server wrote them). Every option is on its OWN line with
 *   its quantity in the same fixed gutter as the item's, so quantities
 *   scan as a column instead of hiding mid-sentence ("Fish Balls x2 · Tofu
 *   x1 · ...") — the trade is vertical space, which this full-screen view
 *   has plenty of and a compact queue card does not.
 * - A quantity above 1 is bold ink; a quantity of 1 is shown too, but muted
 *   — always present so "no number" is never ambiguous, quiet so the eye
 *   lands on the counts that actually deviate.
 * - The customer's note (if any) in its own labelled block; it can change
 *   how the food is made, so it must not be easy to miss.
 */
export function OrderItemLine({ item }: OrderItemLineProps) {
  const { width } = useWindowDimensions();
  const labelBeside = width >= SIDE_LABEL_MIN_WIDTH;
  const groups = groupModifiers(item.modifiers);

  return (
    <View style={styles.container}>
      <View style={styles.itemRow}>
        <Text style={styles.itemQuantity}>{item.quantity}×</Text>
        <Text style={styles.itemName}>{item.nameSnapshot}</Text>
      </View>

      {groups.length > 0 && (
        <View style={styles.modifiers}>
          {item.quantity > 1 && (
            <Text style={styles.applyToEach}>Applies to each of the {item.quantity}</Text>
          )}

          {groups.map((group) => (
            <View key={group.groupName} style={[styles.group, labelBeside && styles.groupSideBySide]}>
              <Text
                style={[styles.groupLabel, labelBeside && { width: SIDE_LABEL_COLUMN_WIDTH }]}
                accessibilityRole="header"
              >
                {group.groupName.toUpperCase()}
              </Text>

              <View style={styles.options}>
                {group.options.map((option) => (
                  <View key={option.id} style={styles.optionRow}>
                    <Text style={[styles.optionQuantity, option.quantity > 1 && styles.optionQuantityEmphasis]}>
                      {option.quantity}×
                    </Text>
                    <Text style={styles.optionName}>{option.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {item.notes ? (
        <View style={styles.note}>
          <Text style={styles.noteLabel}>CUSTOMER NOTE</Text>
          <Text style={styles.noteText}>{item.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING_SCALE[1], // 8px
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  itemQuantity: {
    width: QUANTITY_GUTTER_WIDTH,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "800",
    color: BRAND_COLORS.ink,
  },
  itemName: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "800",
    color: BRAND_COLORS.ink,
  },
  // Indented past the item's quantity gutter so modifiers read as belonging
  // to the item above them, and a left rule ties the block together.
  modifiers: {
    marginLeft: QUANTITY_GUTTER_WIDTH,
    paddingLeft: SPACING_SCALE[2], // 12px
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.line,
    gap: SPACING_SCALE[2], // 12px
  },
  applyToEach: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "700",
    fontStyle: "italic",
    color: BRAND_COLORS.muted,
  },
  group: {
    gap: SPACING_SCALE[0], // 4px
  },
  groupSideBySide: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING_SCALE[2], // 12px
  },
  groupLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "800",
    letterSpacing: 1,
    color: BRAND_COLORS.muted,
    paddingTop: LABEL_OPTICAL_OFFSET_PX,
  },
  options: {
    flex: 1,
    gap: SPACING_SCALE[0], // 4px
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  optionQuantity: {
    width: OPTION_QUANTITY_WIDTH,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "600",
    color: BRAND_COLORS.muted,
  },
  optionQuantityEmphasis: {
    fontWeight: "800",
    color: BRAND_COLORS.ink,
  },
  optionName: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "600",
    color: BRAND_COLORS.ink,
  },
  note: {
    marginLeft: QUANTITY_GUTTER_WIDTH,
    backgroundColor: BRAND_COLORS.soft,
    borderRadius: RADIUS.sm,
    padding: SPACING_SCALE[2], // 12px
    gap: SPACING_SCALE[0], // 4px
  },
  noteLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "800",
    letterSpacing: 1,
    color: BRAND_COLORS.muted,
  },
  noteText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
});
