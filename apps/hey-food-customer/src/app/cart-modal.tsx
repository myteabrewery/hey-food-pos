import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { BRAND_COLORS, RADIUS } from "@hey-food/design-tokens";

import { CartSheetScreen } from "../screens/CartSheetScreen";

/**
 * Visual-only bottom sheet — see docs/customer-app-screens-v2.md Section
 * 5. No real bottom-sheet library (e.g. @gorhom/bottom-sheet + its
 * react-native-reanimated/react-native-gesture-handler peer deps) was
 * added for this pass — that's a real, heavier dependency decision
 * beyond "presentation change, not new cart logic."
 *
 * This gets the visual result (backdrop + rounded sheet anchored to the
 * bottom) via Expo Router's native `transparentModal` presentation
 * (configured on this route in the root _layout.tsx) plus a tap-outside-
 * to-dismiss Pressable backdrop — NOT real gesture-driven drag-to-
 * dismiss. A real bottom-sheet library is the correct follow-up if that
 * gesture matters later.
 */
export default function CartModalRoute() {
  const router = useRouter();

  return (
    <View style={styles.overlay}>
      <Pressable
        style={styles.backdrop}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close cart"
      />
      <View style={styles.sheet}>
        <CartSheetScreen />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    // Dim scrim — no design token exists for a translucent overlay color;
    // this is a standard modal-backdrop convention, not a brand color.
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: BRAND_COLORS.cream,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: "80%",
  },
});
