import { Pressable, StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import type { PosScreen } from "../navigation";
import type { ConnectionState } from "../orders/useLiveOrders";
import { POS_SCREENS } from "../navigation";

export interface TopBarProps {
  outletName: string;
  staffName: string;
  activeScreen: PosScreen;
  /** Real state of the order feed (Stage A): drives the indicator top-right. */
  connection: ConnectionState;
  onNavigate: (screen: PosScreen) => void;
  /** New now that staff PIN login is real (different people share this tablet across a shift) — didn't exist for the old one-button demo stub. */
  onLogOut: () => void;
}

/**
 * Persistent chrome shared by all three logged-in screens (Queue, Menu
 * Availability, Daily Summary) — outlet name + online/offline indicator
 * per docs/hey-food-design-system-v1.md Section 6's Top Navigation entry
 * ("POS: outlet name + online/offline indicator, always visible"), plus
 * top-level navigation buttons since POS/HQ deliberately don't use bottom
 * nav (same section: "used on larger tablet/desktop screens where bottom
 * nav isn't the natural pattern").
 *
 * Navigation mechanism judgment call: three large buttons directly in
 * this top bar, not a separate menu icon/drawer — POS's whole ethos here
 * is "minimal decoration, large touch targets" (Section 4), and with
 * only three screens total a drawer would hide destinations behind an
 * extra tap for no real benefit over just showing all three directly.
 */
const CONNECTION_INDICATOR: Record<ConnectionState, { label: string; color: string }> = {
  live: { label: "ONLINE", color: BRAND_COLORS.teal },
  loading: { label: "CONNECTING", color: BRAND_COLORS.onNavyMuted },
  // Deliberately NOT brand yellow (reserved for the single top CTA per screen,
  // see design-tokens/outlet-health.ts): the label carries the meaning, the dot
  // only distinguishes "connected" from everything else.
  offline: { label: "OFFLINE", color: BRAND_COLORS.onNavyMuted },
  mock: { label: "DEMO DATA", color: BRAND_COLORS.onNavyMuted },
};

export function TopBar({ outletName, staffName, activeScreen, connection, onNavigate, onLogOut }: TopBarProps) {
  const indicator = CONNECTION_INDICATOR[connection];
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.outletName}>{outletName}</Text>
          <View style={styles.staffRow}>
            <Text style={styles.staffName}>{staffName}</Text>
            {/* A deliberately low-emphasis text link, not a large button: logging out is
                infrequent (end of shift), unlike the primary large-target actions elsewhere
                in POS — hitSlop keeps it easy to tap without growing it visually. */}
            <Pressable onPress={onLogOut} hitSlop={12} accessibilityRole="button" accessibilityLabel="Log out">
              <Text style={styles.logOutText}>LOG OUT</Text>
            </Pressable>
          </View>
        </View>

        {/* Reflects the order feed's last poll (or mock mode) — see useLiveOrders. */}
        <View style={styles.onlineIndicator} accessibilityLabel={`Connection: ${indicator.label}`}>
          <View style={[styles.onlineDot, { backgroundColor: indicator.color }]} />
          <Text style={styles.onlineText}>{indicator.label}</Text>
        </View>
      </View>

      <View style={styles.navRow}>
        {POS_SCREENS.map((screen) => {
          const isActive = screen.key === activeScreen;

          return (
            <Pressable
              key={screen.key}
              style={[styles.navButton, isActive && styles.navButtonActive]}
              onPress={() => onNavigate(screen.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${screen.label} screen`}
            >
              <Text style={[styles.navButtonText, isActive && styles.navButtonTextActive]}>
                {screen.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const posSpacing = SPACING_BY_APP.pos;

const styles = StyleSheet.create({
  container: {
    backgroundColor: BRAND_COLORS.navy,
    paddingHorizontal: posSpacing.tapPaddingPx,
    paddingTop: posSpacing.tapPaddingPx,
    gap: posSpacing.tapPaddingPx,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  outletName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
  },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING_SCALE[2], // 12px
    marginTop: SPACING_SCALE[0], // 4px
  },
  staffName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "600",
    color: BRAND_COLORS.onNavyMuted,
  },
  logOutText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "700",
    color: BRAND_COLORS.teal,
    letterSpacing: 0.5,
    textDecorationLine: "underline",
  },
  onlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING_SCALE[0], // 4px
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_COLORS.teal,
  },
  onlineText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "700",
    color: BRAND_COLORS.onNavyMuted,
    letterSpacing: 1,
  },
  navRow: {
    flexDirection: "row",
    gap: posSpacing.queueCardGapPx,
  },
  navButton: {
    flex: 1,
    minHeight: MIN_TAP_TARGET_PX.pos,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: BRAND_COLORS.onNavyMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonActive: {
    backgroundColor: BRAND_COLORS.teal,
    borderColor: BRAND_COLORS.teal,
  },
  navButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "800",
    color: BRAND_COLORS.onNavyMuted,
    letterSpacing: 0.5,
  },
  navButtonTextActive: {
    color: BRAND_COLORS.white,
  },
});
