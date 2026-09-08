import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Outlet, ResolvedMenuItem } from "@hey-food/shared-types";
import { BRAND_COLORS, FONT_FAMILY, MENU_HEADER_TITLE_PX, SPACING_BY_APP, TINY_LABEL_PX, TYPE_SCALE } from "@hey-food/design-tokens";

import { getOutletDetail } from "../api/outlets";
import { useCart } from "../cart/cart-context";
import { useSelectedOutlet } from "../outlet/selected-outlet-context";
import { CategoryPills } from "../components/CategoryPills";
import { MenuItemRow } from "../components/MenuItemRow";
import { SearchBar } from "../components/SearchBar";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; outlet: Outlet; items: ResolvedMenuItem[] };

/**
 * Customer App Menu screen — now a persistent tab (docs/customer-app-
 * screens-v2.md Section 2), not a screen pushed with an `outletId` route
 * param. Reads which outlet to show from SelectedOutletContext (set by
 * Home once it resolves the nearest outlet) instead — see src/outlet/
 * selected-outlet-context.tsx for why this is a separate piece of state
 * from cart-context's `outlet`.
 */
export function MenuScreen() {
  const { outlet: selectedOutlet } = useSelectedOutlet();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const cart = useCart();

  useEffect(() => {
    if (!selectedOutlet) {
      return;
    }

    let cancelled = false;

    getOutletDetail(selectedOutlet.id)
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
  }, [selectedOutlet]);

  // No selected outlet yet is derived directly from context during
  // render, not stored as state set from inside the effect above — same
  // react-hooks reasoning as the earlier "missing outletId" guard clause
  // (avoid synchronous setState-in-effect for something genuinely
  // derivable).
  const effectiveState: LoadState = selectedOutlet ? state : { status: "error" };
  const notReadyYet = !selectedOutlet;

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
          <Text style={styles.message}>
            {notReadyYet
              ? "Still finding your nearest outlet — check back in a moment."
              : "Could not load the menu. Try again shortly."}
          </Text>
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
