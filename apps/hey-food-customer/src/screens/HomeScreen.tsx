import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import type { NearbyOutlet } from "@hey-food/api-client";
import { BRAND_COLORS, FONT_FAMILY, SPACING_BY_APP, TYPE_SCALE } from "@hey-food/design-tokens";

import { getNearbyOutlets } from "../api/outlets";
import { CategoryShortcuts } from "../components/CategoryShortcuts";
import { OutletCard } from "../components/OutletCard";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; outlets: NearbyOutlet[] };

// Placeholder device coordinates until real geolocation is wired up
// (blueprint Section 9 / dev spec Section 7 — GPS + geofence detection).
const MOCK_DEVICE_LOCATION = { lat: 3.15, lng: 101.61 };

export interface HomeScreenProps {
  /** Called when the customer taps "Order Now" on the nearest-outlet card. */
  onSelectOutlet?: (outlet: NearbyOutlet) => void;
}

/**
 * Customer App Home screen — dev spec Section 4.1.
 *
 * Simplification for this pass: dev spec Section 4.1 also specifies a
 * ranked list for the "multiple outlets in range" case. Only the
 * single-nearest-outlet hero card was specified/designed this round, so
 * this screen renders the closest outlet regardless of how many came
 * back — a proper ranked list is a follow-up, not an oversight.
 */
export function HomeScreen({ onSelectOutlet }: HomeScreenProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  // Extracted (rather than indexed inline in the JSX below) so TypeScript
  // can narrow it to a definite NearbyOutlet, not `NearbyOutlet | undefined`
  // — noUncheckedIndexedAccess doesn't propagate through a `.length > 0`
  // check on the array it was indexed from.
  const nearestOutlet = state.status === "loaded" ? state.outlets[0] : undefined;

  useEffect(() => {
    let cancelled = false;

    getNearbyOutlets(MOCK_DEVICE_LOCATION)
      .then((response) => {
        if (!cancelled) {
          setState({ status: "loaded", outlets: response.data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {state.status === "loading" && (
          <ActivityIndicator color={BRAND_COLORS.ember500} />
        )}

        {state.status === "error" && (
          <Text style={styles.message}>
            We could not find a Hey Food outlet nearby. Try again shortly.
          </Text>
        )}

        {state.status === "loaded" && state.outlets.length === 0 && (
          <Text style={styles.message}>
            No Hey Food outlets nearby yet — search all outlets instead.
          </Text>
        )}

        {nearestOutlet && (
          <OutletCard
            outlet={nearestOutlet}
            onPressOrderNow={() => onSelectOutlet?.(nearestOutlet)}
          />
        )}

        <View style={styles.shortcuts}>
          <CategoryShortcuts />
        </View>
      </ScrollView>
    </View>
  );
}

const customerSpacing = SPACING_BY_APP.customer;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_COLORS.white,
  },
  content: {
    padding: customerSpacing.cardPaddingPx,
  },
  shortcuts: {
    marginTop: customerSpacing.elementGapPx,
  },
  message: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.char500,
    textAlign: "center",
  },
});
