import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, RADIUS, SEARCH_BAR_PADDING, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

/**
 * Presentational only — no live search/filtering logic yet, same "not
 * wired" treatment as Home's category shortcuts. A plain View standing in
 * for a real TextInput until search is actually implemented.
 */
export function SearchBar() {
  return (
    <View style={styles.bar}>
      <Ionicons name="search" size={16} color={BRAND_COLORS.muted} />
      <Text style={styles.placeholder}>Search menu</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING_SCALE[1], // 8px
    backgroundColor: BRAND_COLORS.soft,
    borderRadius: RADIUS.md,
    paddingVertical: SEARCH_BAR_PADDING.verticalPx,
    paddingHorizontal: SEARCH_BAR_PADDING.horizontalPx,
  },
  placeholder: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
  },
});
