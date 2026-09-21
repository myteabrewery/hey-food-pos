import { StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, DANGER_COLORS, FONT_FAMILY, SPACING_BY_APP, TYPE_SCALE } from "@hey-food/design-tokens";

import type { ConnectionState } from "../orders/useLiveOrders";
import { ActionErrorBanner } from "./ActionErrorBanner";

export interface SyncNoticeProps {
  connection: ConnectionState;
  errorMessage: string | null;
  /** A staff action that could not be saved and was undone; shown until dismissed or it times out. */
  actionError: string | null;
  onDismissActionError: () => void;
}

/**
 * The strip(s) under the top bar saying how far to trust the queue below.
 * Live and healthy shows NOTHING: every Start / Ready / Collect / Cancel is
 * saved to the server, and the top-bar indicator already says ONLINE. It
 * speaks up when that stops being true: the feed is down, the data is demo
 * data, or a specific action was undone because it couldn't be saved.
 */
export function SyncNotice({ connection, errorMessage, actionError, onDismissActionError }: SyncNoticeProps) {
  return (
    <>
      {connection === "offline" && (
        <View style={[styles.strip, styles.errorStrip]} accessibilityRole="alert">
          <Text style={styles.errorText}>
            {`${errorMessage ?? "Can't reach the server."} Showing the last orders received. Start / Ready / Collect / Cancel can't be saved until it's back — a tap will be undone with an error.`}
          </Text>
        </View>
      )}

      {actionError !== null && <ActionErrorBanner message={actionError} onDismiss={onDismissActionError} />}

      {connection === "mock" && (
        <View style={styles.strip}>
          <Text style={styles.text}>
            Demo data: built-in sample orders, no server. Start / Ready / Collect / Cancel stay on this tablet only.
          </Text>
        </View>
      )}

      {connection === "loading" && (
        <View style={styles.strip}>
          <Text style={styles.text}>Loading orders…</Text>
        </View>
      )}
    </>
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
