import { StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, TYPE_SCALE } from "@hey-food/design-tokens";

// Hardcoded placeholder — there's no authenticated customer/session data
// anywhere in this app yet (no login flow exists). A real avatar would
// use the logged-in customer's actual initial.
const PLACEHOLDER_INITIAL = "H";

// Component-specific dimension, not tokenized — same convention as
// MenuItemRow's IMAGE_SIZE.
const AVATAR_SIZE = 36;

/** docs/customer-app-screens-v2.md Section 3.1: logo wordmark + circular avatar. */
export function HomeTopBar() {
  return (
    <View style={styles.row}>
      <Text style={styles.wordmark}>
        HEY <Text style={styles.wordmarkAccent}>FOOD</Text>
      </Text>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{PLACEHOLDER_INITIAL}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wordmark: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  wordmarkAccent: {
    color: BRAND_COLORS.teal,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: BRAND_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.white,
  },
});
