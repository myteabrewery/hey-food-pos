import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Outlet, ResolvedMenuItem } from "@hey-food/shared-types";
import { BRAND_COLORS, FONT_FAMILY, MENU_HEADER_LABEL_PX, MENU_HEADER_TITLE_PX, SPACING_BY_APP, TYPE_SCALE } from "@hey-food/design-tokens";

import { getOutletDetail } from "../api/outlets";
import { CategoryPills } from "../components/CategoryPills";
import { MenuItemRow } from "../components/MenuItemRow";
import { SearchBar } from "../components/SearchBar";

export interface MenuScreenProps {
  /** From the route params (Expo Router) — see src/app/menu.tsx. */
  outletId: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; outlet: Outlet; items: ResolvedMenuItem[] };

/**
 * Customer App Menu screen — docs/customer-app-screens-v1.md's "Menu
 * Screen" section.
 *
 * Takes only an `outletId` (a route param, so it has to be a plain
 * string) and fetches outlet + menu together via `GET /outlets/:id` — see
 * api/outlets.ts's getOutletDetail for why this replaced the earlier
 * "pass the whole outlet object down" approach.
 *
 * No cart system exists yet (deliberately, per this pass's scope) — adding
 * an item only updates an in-memory count local to this screen and logs
 * to the console. There's no visible cart UI, no running total, no
 * checkout affordance. A real cart (shared across screens, persisted,
 * with its own summary) is the next piece needed, not something to
 * quietly half-build here.
 */
export function MenuScreen({ outletId }: MenuScreenProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  // The count itself isn't read anywhere (no cart UI exists yet, per this
  // screen's scope) — only the setter is used, to prove the state update
  // is real.
  const [, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!outletId) {
      return;
    }

    let cancelled = false;

    getOutletDetail(outletId)
      .then((response) => {
        if (!cancelled) {
          setState({ status: "loaded", outlet: response.outlet, items: response.menu });
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
  }, [outletId]);

  // Missing outletId is derived directly from props during render, not
  // stored as state set from inside the effect above — react-hooks flags
  // synchronous setState-in-effect for exactly this shape of "guard
  // clause", and this is genuinely derivable rather than needing to be
  // remembered as its own state.
  const effectiveState: LoadState = outletId ? state : { status: "error" };

  function handleAdd(item: ResolvedMenuItem) {
    setCounts((prev) => {
      const nextCount = (prev[item.id] ?? 0) + 1;
      console.log(`Added "${item.name}" — local count now ${nextCount}`);
      return { ...prev, [item.id]: nextCount };
    });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.orderingFromLabel}>ORDERING FROM</Text>
        <Text style={styles.outletName}>
          {effectiveState.status === "loaded" ? effectiveState.outlet.name : "Hey Food"}
        </Text>
      </View>

      <View style={styles.searchSection}>
        <SearchBar />
      </View>

      <View style={styles.pillsSection}>
        <CategoryPills />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {effectiveState.status === "loading" && (
          <ActivityIndicator color={BRAND_COLORS.ember500} />
        )}

        {effectiveState.status === "error" && (
          <Text style={styles.message}>Could not load the menu. Try again shortly.</Text>
        )}

        {effectiveState.status === "loaded" &&
          effectiveState.items.map((item) => (
            <MenuItemRow key={item.id} item={item} onAdd={handleAdd} />
          ))}
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
  header: {
    padding: customerSpacing.cardPaddingPx,
  },
  orderingFromLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: MENU_HEADER_LABEL_PX,
    fontWeight: "400",
    color: BRAND_COLORS.char400,
  },
  outletName: {
    fontFamily: FONT_FAMILY,
    fontSize: MENU_HEADER_TITLE_PX,
    fontWeight: "700",
    color: BRAND_COLORS.char900,
  },
  searchSection: {
    paddingHorizontal: customerSpacing.cardPaddingPx,
  },
  pillsSection: {
    paddingHorizontal: customerSpacing.cardPaddingPx,
    marginTop: customerSpacing.elementGapPx,
  },
  list: {
    padding: customerSpacing.cardPaddingPx,
    gap: customerSpacing.elementGapPx,
  },
  message: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.char500,
    textAlign: "center",
  },
});
