import { StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, TYPE_SCALE } from "@hey-food/design-tokens";

export interface ComingSoonScreenProps {
  label: string;
}

/** Placeholder for the Rewards and Account tabs — docs/customer-app-screens-v2.md Section 2: "simple placeholder" content is enough for this pass. */
export function ComingSoonScreen({ label }: ComingSoonScreenProps) {
  return (
    <View style={styles.screen}>
      <Text style={styles.message}>{label} — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_COLORS.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "600",
    color: BRAND_COLORS.muted,
  },
});
