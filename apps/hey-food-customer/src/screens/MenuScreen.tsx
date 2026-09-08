import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Outlet, ResolvedMenuItem } from "@hey-food/shared-types";
import { BRAND_COLORS, FONT_FAMILY, MENU_HEADER_TITLE_PX, SPACING_BY_APP, TINY_LABEL_PX, TYPE_SCALE } from "@hey-food/design-tokens";

import { getOutletDetail } from "../api/outlets";
import { useCart } from "../cart/cart-context";
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
 * Adding an item calls into the real cart (src/cart/cart-context.tsx),
 * consumed by the Checkout screen. There's still no in-app affordance to
 * navigate from here to Checkout — the spec doc doesn't define a cart-
 * access UI on this screen (no floating bar, no "view cart" button), so
 * none was added; Checkout is reachable directly during development but
 * not yet from this screen's own UI.
 */
export function MenuScreen({ outletId }: MenuScreenProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const cart = useCart();

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
    if (effectiveState.status !== "loaded") {
      return;
    }
    cart.addItem({ id: effectiveState.outlet.id, name: effectiveState.outlet.name }, item);
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
          <ActivityIndicator color={BRAND_COLORS.teal} />
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
    backgroundColor: BRAND_COLORS.cream,
  },
  header: {
    padding: customerSpacing.cardPaddingPx,
  },
  orderingFromLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: TINY_LABEL_PX,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
  },
  outletName: {
    fontFamily: FONT_FAMILY,
    fontSize: MENU_HEADER_TITLE_PX,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
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
    color: BRAND_COLORS.muted,
    textAlign: "center",
  },
});
