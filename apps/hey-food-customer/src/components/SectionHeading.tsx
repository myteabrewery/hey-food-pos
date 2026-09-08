import { StyleSheet, Text } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, TYPE_SCALE } from "@hey-food/design-tokens";

export interface SectionHeadingProps {
  children: string;
}

/** Shared heading style for Home's composite sections ("Your outlet", "Popular right now", "Order in progress"). */
export function SectionHeading({ children }: SectionHeadingProps) {
  return <Text style={styles.heading}>{children}</Text>;
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
});
