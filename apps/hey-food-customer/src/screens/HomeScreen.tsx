import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { NearbyOutlet, OrderWithItems } from "@hey-food/api-client";
import type { ResolvedMenuItem } from "@hey-food/shared-types";
import { BRAND_COLORS, FONT_FAMILY, SPACING_BY_APP, TYPE_SCALE } from "@hey-food/design-tokens";

import { getActiveOrder } from "../api/orders";
import { getNearbyOutlets, getOutletDetail } from "../api/outlets";
import { useCart } from "../cart/cart-context";
import { useSelectedOutlet } from "../outlet/selected-outlet-context";
import { CategoryShortcuts } from "../components/CategoryShortcuts";
import { HeroCard } from "../components/HeroCard";
import { HomeTopBar } from "../components/HomeTopBar";
import { MenuItemRow } from "../components/MenuItemRow";
import { OrderProgressCard } from "../components/OrderProgressCard";
import { OutletCard } from "../components/OutletCard";
import { SectionHeading } from "../components/SectionHeading";

type OutletLoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; outlets: NearbyOutlet[] };

type MenuPreviewState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; items: ResolvedMenuItem[] };

type ActiveOrderState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; order: OrderWithItems };

// Placeholder device coordinates until real geolocation is wired up
// (blueprint Section 9 / dev spec Section 7 — GPS + geofence detection).
// Set to Paradigm Mall's own coordinates deliberately, now that
// getNearbyOutlets hits the real backend: the backend actually filters to
// outlets whose geofence contains this point (dev spec Section 2/7), so an
// arbitrary nearby-but-not-quite-inside point (the old { lat: 3.15, lng:
// 101.61 }, ~244m away — outside Paradigm Mall's 100m radius) would make
// this screen's "Your outlet" section correctly, but unhelpfully, always
// show the empty state.
const MOCK_DEVICE_LOCATION = { lat: 3.1499, lng: 101.6122 };

// How many items "Popular right now" shows — a short slice, not the full menu.
const POPULAR_ITEMS_COUNT = 2;

export interface HomeScreenProps {
  /** Called when the customer wants to go order — now just a tab switch, since SelectedOutletContext already carries which outlet. */
  onSelectOutlet?: () => void;
}

/**
 * Customer App Home screen — rebuilt as the multi-section scrolling
 * composite per docs/customer-app-screens-v2.md Section 3 (top bar,
 * location line, hero card, categories, "Your outlet" card, "Popular
 * right now" preview, conditional order-progress section). Replaces the
 * earlier single-purpose outlet-detection screen.
 *
 * Simplification carried over from the earlier pass: dev spec Section 4.1
 * also specifies a ranked list for the "multiple outlets in range" case.
 * Only the single-nearest-outlet card was specified/designed, so this
 * screen still renders the closest outlet regardless of how many came
 * back.
 */
export function HomeScreen({ onSelectOutlet }: HomeScreenProps) {
  const router = useRouter();
  const cart = useCart();
  const { setOutlet: setSelectedOutlet } = useSelectedOutlet();

  const [outletState, setOutletState] = useState<OutletLoadState>({ status: "loading" });
  const [menuPreview, setMenuPreview] = useState<MenuPreviewState>({ status: "loading" });
  const [activeOrder, setActiveOrder] = useState<ActiveOrderState>({ status: "loading" });

  const nearestOutlet = outletState.status === "loaded" ? outletState.outlets[0] : undefined;

  useEffect(() => {
    let cancelled = false;

    getNearbyOutlets(MOCK_DEVICE_LOCATION)
      .then((response) => {
        if (!cancelled) {
          setOutletState({ status: "loaded", outlets: response.data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOutletState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (nearestOutlet) {
      setSelectedOutlet(nearestOutlet);
    }
  }, [nearestOutlet, setSelectedOutlet]);

  useEffect(() => {
    if (!nearestOutlet) {
      return;
    }

    let cancelled = false;

    getOutletDetail(nearestOutlet.id)
      .then((response) => {
        if (!cancelled) {
          setMenuPreview({
            status: "loaded",
            items: response.menu.slice(0, POPULAR_ITEMS_COUNT),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMenuPreview({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [nearestOutlet]);

  useEffect(() => {
    let cancelled = false;

    getActiveOrder()
      .then((order) => {
        if (!cancelled) {
          setActiveOrder({ status: "loaded", order });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActiveOrder({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleAddPreviewItem(item: ResolvedMenuItem) {
    if (!nearestOutlet) {
      return;
    }
    cart.addItem({ id: nearestOutlet.id, name: nearestOutlet.name }, item);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <HomeTopBar />

        {/* Placeholder copy — v2 doesn't give exact wording, only "small
            text, muted, with the outlet name/area in ink". */}
        <Text style={styles.locationLine}>
          Ordering near{" "}
          <Text style={styles.locationLineOutlet}>
            {nearestOutlet ? nearestOutlet.name : "your area"}
          </Text>
        </Text>

        <View style={styles.section}>
          <HeroCard onPressExplore={() => router.navigate("/menu")} />
        </View>

        <View style={styles.section}>
          <CategoryShortcuts />
        </View>

        <View style={styles.section}>
          <SectionHeading>Your outlet</SectionHeading>
          <View style={styles.sectionBody}>
            {outletState.status === "loading" && (
              <ActivityIndicator color={BRAND_COLORS.teal} />
            )}
            {outletState.status === "error" && (
              <Text style={styles.message}>
                We could not find a Hey Food outlet nearby. Try again shortly.
              </Text>
            )}
            {outletState.status === "loaded" && outletState.outlets.length === 0 && (
              <Text style={styles.message}>
                No Hey Food outlets nearby yet — search all outlets instead.
              </Text>
            )}
            {nearestOutlet && (
              <OutletCard outlet={nearestOutlet} onPressOrderNow={() => onSelectOutlet?.()} />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.popularHeaderRow}>
            <SectionHeading>Popular right now</SectionHeading>
            <Pressable onPress={() => router.navigate("/menu")}>
              <Text style={styles.seeAllLink}>See all</Text>
            </Pressable>
          </View>
          <View style={styles.sectionBody}>
            {menuPreview.status === "loading" && (
              <ActivityIndicator color={BRAND_COLORS.teal} />
            )}
            {menuPreview.status === "error" && (
              <Text style={styles.message}>Could not load the menu right now.</Text>
            )}
            {menuPreview.status === "loaded" && (
              <View style={styles.previewList}>
                {menuPreview.items.map((item) => (
                  <MenuItemRow key={item.id} item={item} onAdd={handleAddPreviewItem} />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Conditional per docs/customer-app-screens-v2.md Section 3.7 —
            only rendered when there's an active order. This stub's
            getActiveOrder always resolves to one, so this section is
            always visible for review; a real implementation could
            resolve to null and this section would simply not render. */}
        {activeOrder.status === "loaded" && (
          <View style={styles.section}>
            <SectionHeading>Order in progress</SectionHeading>
            <View style={styles.sectionBody}>
              <OrderProgressCard
                order={activeOrder.order}
                outletName={nearestOutlet?.name ?? "Hey Food"}
              />
            </View>
          </View>
        )}
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
  content: {
    padding: customerSpacing.cardPaddingPx,
  },
  locationLine: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
    marginTop: customerSpacing.cardPaddingPx,
  },
  locationLineOutlet: {
    color: BRAND_COLORS.ink,
    fontWeight: "600",
  },
  section: {
    marginTop: customerSpacing.elementGapPx,
  },
  sectionBody: {
    marginTop: customerSpacing.cardPaddingPx,
  },
  popularHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seeAllLink: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "600",
    color: BRAND_COLORS.teal,
  },
  previewList: {
    gap: customerSpacing.cardPaddingPx,
  },
  message: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
    textAlign: "center",
  },
});
