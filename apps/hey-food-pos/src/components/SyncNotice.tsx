import { StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, DANGER_COLORS, FONT_FAMILY, SPACING_BY_APP, TYPE_SCALE } from "@hey-food/design-tokens";

import type { ConnectionState } from "../orders/useLiveOrders";

export interface SyncNoticeProps {
  connection: ConnectionState;
  errorMessage: string | null;
}

/**
 * One line under the top bar saying what the queue below is showing and how
 * far to trust it. It exists because Stage A is deliberately half-live: orders
 * arrive from the server, but staff actions do not go back (Stage B), and a
 * kitchen must never be left believing otherwise.
 */
export function SyncNotice({ connection, errorMessage }: SyncNoticeProps) {
  if (connection === "offline") {
    return (
      <View style={[styles.strip, styles.errorStrip]} accessibilityRole="alert">
        <Text style={styles.errorText}>
          {errorMessage ?? "Can't reach the server."} Showing the last orders received; retrying every few seconds.
        </Text>
      </View>
    );
  }

  const text =
    connection === "mock"
      ? "Demo data: these are built-in sample orders, not from the server."
      : connection === "loading"
        ? "Loading orders…"
        : "Demo build: Start / Ready / Collect / Cancel are kept on this tablet only and are not sent to the server yet.";

  return (
    <View style={styles.strip}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    paddingHorizontal: SPACING_BY_APP.pos.tapPaddingPx,
    paddingVertical: 6,
  },
  errorStrip: {
    backgroundColor: DANGER_COLORS.tint,
  },
  text: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "600",
    color: BRAND_COLORS.onNavyMuted,
  },
  errorText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "700",
    color: DANGER_COLORS.solid,
  },
});
