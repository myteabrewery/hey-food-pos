import { Pressable, StyleSheet, Text } from "react-native";

import { DANGER_COLORS, FONT_FAMILY, SPACING_BY_APP, TYPE_SCALE } from "@hey-food/design-tokens";

export interface ActionErrorBannerProps {
  /** Why a staff action was undone, e.g. "Couldn't start #PM003: ... It has been put back as it was." */
  message: string;
  onDismiss: () => void;
}

/**
 * The red strip shown when a staff action could not be saved and was rolled
 * back (see useOptimisticActions). Shared by the queue and the menu screen so
 * the two can never word or style a failed action differently. Tap to dismiss;
 * it also clears itself after a few seconds.
 */
export function ActionErrorBanner({ message, onDismiss }: ActionErrorBannerProps) {
  return (
    <Pressable
      style={styles.strip}
      onPress={onDismiss}
      accessibilityRole="alert"
      accessibilityLabel={`${message} Tap to dismiss.`}
    >
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.dismiss}>TAP TO DISMISS</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    paddingHorizontal: SPACING_BY_APP.pos.tapPaddingPx,
    paddingVertical: 6,
    backgroundColor: DANGER_COLORS.tint,
  },
  message: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "700",
    color: DANGER_COLORS.solid,
  },
  dismiss: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "800",
    letterSpacing: 1,
    color: DANGER_COLORS.solid,
    marginTop: 2,
  },
});
