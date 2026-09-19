import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import { PLACEHOLDER_CATEGORIES } from "../constants/categories";

export interface CategoryShortcutsProps {
  onSelectCategory?: (category: string) => void;
}

// Category names themselves (PLACEHOLDER_CATEGORIES: "Rice", "Noodles",
// etc.) are intentionally NOT translated here — same exclusion as product
// names/descriptions elsewhere. They represent menu content (categories
// live on `Product` per that file's own comment), not UI chrome, even
// though they're currently a hardcoded constant rather than live backend
// data.
export function CategoryShortcuts({ onSelectCategory }: CategoryShortcutsProps) {
  const { t } = useTranslation();

  return (
    <View>
      <Text style={styles.heading}>{t("categoryShortcuts.heading")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {PLACEHOLDER_CATEGORIES.map((category) => (
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
    color: BRAND_COLORS.muted,
    marginBottom: SPACING_SCALE[1], // 8px
  },
  row: {
    gap: SPACING_SCALE[1], // 8px between chips
  },
  // Same white-card-with-border treatment as Menu's CategoryPills, applied
  // here too for consistency (not explicitly re-specified for this
  // component, but it's the identical "inactive pill" pattern).
  chip: {
    backgroundColor: BRAND_COLORS.white,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: RADIUS.sm,
    minHeight: MIN_TAP_TARGET_PX.customer,
    paddingHorizontal: customerSpacing.cardPaddingPx,
    alignItems: "center",
    justifyContent: "center",
  },
  chipPressed: {
    backgroundColor: BRAND_COLORS.teal,
    borderWidth: 0,
  },
  chipText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.ink,
  },
  chipTextPressed: {
    color: BRAND_COLORS.white,
  },
});
