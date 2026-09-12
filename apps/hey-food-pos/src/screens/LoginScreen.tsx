import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import { MOCK_OUTLET_NAME } from "../mock/session";

export interface LoginScreenProps {
  onLogIn: () => void;
}

/**
 * PLACEHOLDER — not real staff authentication. docs/hey-food-developer-
 * spec-v1.md Section 5.5: real login is PIN-based, with the device
 * pre-bound to its outlet at setup (outlet is never chosen at login).
 * This screen exists only to get past a login screen into the queue for
 * this pass — one button, no PIN pad, no device-binding check. The
 * on-screen caption is deliberate, not just a code comment: unlike most
 * of this session's other stubs, a login screen is the one place where
 * silently skipping real auth is worth surfacing to whoever's looking at
 * the device, not just to whoever reads the source.
 */
export function LoginScreen({ onLogIn }: LoginScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.wordmark}>HEY FOOD</Text>
        <Text style={styles.productName}>OUTLET POS</Text>

        <View style={styles.outletBlock}>
          <Text style={styles.outletLabel}>DEVICE BOUND TO</Text>
          <Text style={styles.outletName}>{MOCK_OUTLET_NAME}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.logInButton, pressed && styles.logInButtonPressed]}
          onPress={onLogIn}
          accessibilityRole="button"
          accessibilityLabel="Log in"
        >
          <Text style={styles.logInButtonText}>LOG IN</Text>
        </Pressable>

        <Text style={styles.stubCaption}>Demo login — real staff PIN auth not yet built</Text>
      </View>
    </View>
  );
}

const posSpacing = SPACING_BY_APP.pos;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    paddingHorizontal: posSpacing.tapPaddingPx,
  },
  wordmark: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.display.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    letterSpacing: 1,
  },
  productName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "700",
    color: BRAND_COLORS.onNavyMuted,
    letterSpacing: 2,
    marginTop: SPACING_SCALE[0], // 4px
  },
  outletBlock: {
    alignItems: "center",
    marginTop: SPACING_SCALE[6], // 48px
    gap: SPACING_SCALE[0], // 4px
  },
  outletLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "700",
    color: BRAND_COLORS.onNavyMuted,
    letterSpacing: 1,
  },
  outletName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "700",
    color: BRAND_COLORS.white,
    textAlign: "center",
  },
  logInButton: {
    width: "100%",
    minHeight: MIN_TAP_TARGET_PX.pos,
    borderRadius: RADIUS.md,
    backgroundColor: BRAND_COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING_SCALE[6], // 48px
  },
  logInButtonPressed: {
    backgroundColor: BRAND_COLORS.tealDark,
  },
  logInButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    letterSpacing: 1,
  },
  stubCaption: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "600",
    color: BRAND_COLORS.onNavyMuted,
    marginTop: SPACING_SCALE[2], // 12px
    textAlign: "center",
  },
});
