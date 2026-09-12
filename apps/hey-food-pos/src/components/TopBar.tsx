import { Pressable, StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import type { PosScreen } from "../navigation";
import { POS_SCREENS } from "../navigation";

export interface TopBarProps {
  outletName: string;
  staffName: string;
  activeScreen: PosScreen;
  onNavigate: (screen: PosScreen) => void;
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
export function TopBar({ outletName, staffName, activeScreen, onNavigate }: TopBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.outletName}>{outletName}</Text>
          <Text style={styles.staffName}>{staffName}</Text>
        </View>

        {/* STUB — no real connectivity check exists yet, always "Online". */}
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>ONLINE</Text>
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
  staffName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "600",
    color: BRAND_COLORS.onNavyMuted,
    marginTop: SPACING_SCALE[0], // 4px
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
