import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import { PLACEHOLDER_CATEGORIES } from "../constants/categories";

// Presentational only, matching the search bar — no filtering logic yet.
// A pill is statically "active" for visual demonstration; tapping does
// nothing, same as Home's category shortcuts.
const ACTIVE_CATEGORY: string = PLACEHOLDER_CATEGORIES[0];

export function CategoryPills() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {PLACEHOLDER_CATEGORIES.map((category) => {
        const isActive = category === ACTIVE_CATEGORY;
        return (
          <View key={category} style={[styles.pill, isActive && styles.pillActive]}>
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {category}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const customerSpacing = SPACING_BY_APP.customer;

const styles = StyleSheet.create({
  row: {
    gap: SPACING_SCALE[1], // 8px between pills
  },
  // v2: inactive pills are white cards with a line border, not a neutral fill.
  pill: {
    backgroundColor: BRAND_COLORS.white,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: RADIUS.pill,
    paddingHorizontal: customerSpacing.cardPaddingPx,
    paddingVertical: SPACING_SCALE[0], // 4px
  },
  pillActive: {
    backgroundColor: BRAND_COLORS.teal,
    borderWidth: 0,
  },
  pillText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "600",
    color: BRAND_COLORS.muted,
  },
  pillTextActive: {
    color: BRAND_COLORS.white,
  },
});
