import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

/**
 * Placeholder category set. Dev spec doesn't define a category taxonomy
 * independent of a specific outlet's menu (categories live on `Product`,
 * scoped per outlet) — this is presentational only until there's a real
 * source for "categories across all outlets" and a menu screen to route
 * a tap to.
 */
const CATEGORIES = ["Rice", "Noodles", "Drinks", "Dessert", "Snacks"] as const;

export interface CategoryShortcutsProps {
  onSelectCategory?: (category: string) => void;
}

export function CategoryShortcuts({ onSelectCategory }: CategoryShortcutsProps) {
  return (
    <View>
      <Text style={styles.heading}>What are you craving?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {CATEGORIES.map((category) => (
          <Pressable
            key={category}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            onPress={() => onSelectCategory?.(category)}
            accessibilityRole="button"
            accessibilityLabel={category}
          >
            {({ pressed }) => (
              <Text style={[styles.chipText, pressed && styles.chipTextPressed]}>
                {category}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const customerSpacing = SPACING_BY_APP.customer;

const styles = StyleSheet.create({
  heading: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "600",
    color: BRAND_COLORS.char900,
    marginBottom: SPACING_SCALE[1], // 8px
  },
  row: {
    gap: SPACING_SCALE[1], // 8px between chips
  },
  chip: {
    backgroundColor: BRAND_COLORS.neutral100,
    borderRadius: RADIUS.sm,
    minHeight: MIN_TAP_TARGET_PX.customer,
    paddingHorizontal: customerSpacing.cardPaddingPx,
    alignItems: "center",
    justifyContent: "center",
  },
  chipPressed: {
    backgroundColor: BRAND_COLORS.ember500,
  },
  chipText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.char900,
  },
  chipTextPressed: {
    color: BRAND_COLORS.white,
  },
});
