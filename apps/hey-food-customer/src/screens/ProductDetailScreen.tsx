import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ResolvedMenuItem } from "@hey-food/shared-types";
import { BRAND_COLORS, FONT_FAMILY, LARGE_BUTTON_PADDING_VERTICAL_PX, MENU_HEADER_TITLE_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import type { CartItemModifier } from "../cart/cart-context";
import { useCart } from "../cart/cart-context";
import { useSelectedOutlet } from "../outlet/selected-outlet-context";
import { getOutletDetail } from "../api/outlets";
import { ModifierGroupSelector } from "../components/ModifierGroupSelector";
import { QuantityStepper } from "../components/QuantityStepper";

export interface ProductDetailScreenProps {
  productId: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; item: ResolvedMenuItem };

/**
 * docs/product-customization-v1.md's Product Detail screen — never built
 * before this pass (was screen #7 in the original sitemap), so there's no
 * mockup to match; layout/spacing choices here are consistent with the
 * rest of the app's tokens but not pixel-matched to any spec.
 *
 * Reuses `GET /outlets/:id` (via the existing getOutletDetail, same one
 * Menu already calls) rather than adding a new endpoint — the resolved
 * menu item, modifierGroups included, is already everything this screen
 * needs. This does mean a redundant re-fetch of the whole menu rather
 * than reusing whatever Menu already has in memory (no shared "last
 * fetched menu" cache exists to read from instead) — traded off for
 * robustness (this screen works from a direct link too, not just
 * navigation from Menu) and simplicity over saving one network call
 * against a local dev backend. Worth revisiting if this ever needs to
 * work against real network latency.
 *
 * Rebuilt for docs/product-customization-v2.md (Stage 3.5) — selection
 * state is now a flat `optionId -> quantity` map rather than
 * `groupId -> optionId[]`: a plain checkbox/radio toggle is just quantity
 * 0 or 1, and a `quantityEnabled` option's stepper is quantity 0..N, so
 * one shape covers both instead of needing two parallel data structures.
 */
export function ProductDetailScreen({ productId }: ProductDetailScreenProps) {
  const { outlet: selectedOutlet } = useSelectedOutlet();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const cart = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!selectedOutlet) {
      return;
    }

    let cancelled = false;

    getOutletDetail(selectedOutlet.id)
      .then((response) => {
        if (cancelled) {
          return;
        }
        const item = response.menu.find((menuItem) => menuItem.id === productId);
        setState(item ? { status: "loaded", item } : { status: "error" });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOutlet, productId]);

  const item = state.status === "loaded" ? state.item : null;

  function handleChangeQuantity(
    group: ResolvedMenuItem["modifierGroups"][number],
    optionId: string,
    nextQuantity: number,
  ) {
    setSelections((prev) => {
      const next = { ...prev };

      if (group.selectionType === "single" && nextQuantity > 0) {
        // Radio exclusivity: selecting one option in a "single" group
        // clears every sibling first.
        for (const option of group.options) {
          delete next[option.id];
        }
      }

      if (nextQuantity > 0) {
        next[optionId] = nextQuantity;
      } else {
        delete next[optionId];
      }

      return next;
    });
  }

  const selectedModifiers = useMemo<CartItemModifier[]>(() => {
    if (!item) {
      return [];
    }
    const result: CartItemModifier[] = [];
    for (const group of item.modifierGroups) {
      for (const option of group.options) {
        const optionQuantity = selections[option.id] ?? 0;
        if (optionQuantity > 0) {
          result.push({
            optionId: option.id,
            groupName: group.name,
            optionName: option.name,
            priceDelta: option.priceDelta,
            quantity: optionQuantity,
          });
        }
      }
    }
    return result;
  }, [item, selections]);

  // Client-side check for immediate UX feedback (enabling/disabling "Add
  // to cart") only — the backend's validateSelectedModifiers remains the
  // actual authority, same principle as the price display below. Mirrors
  // its minSelections rule: the count of DISTINCT options selected per
  // group (not summed quantity) must meet that group's minimum.
  // maxSelections doesn't need checking here — ModifierGroupSelector
  // already makes exceeding it impossible to trigger from the UI.
  const isValid = useMemo(() => {
    if (!item) {
      return false;
    }
    return item.modifierGroups.every((group) => {
      const selectedCount = group.options.filter((option) => (selections[option.id] ?? 0) > 0).length;
      return selectedCount >= group.minSelections;
    });
  }, [item, selections]);

  // DISPLAY ONLY. The real charge is always computed server-side at order
  // creation (validateSelectedModifiers resolves selectedModifierOptions
  // against the product's actual options and computes priceDeltaSnapshot
  // itself) — this sum is never trusted or sent as a price, only shown.
  const modifiersDelta = selectedModifiers.reduce(
    (sum, modifier) => sum + modifier.priceDelta * modifier.quantity,
    0,
  );
  const unitPrice = (item?.price ?? 0) + modifiersDelta;
  const displayTotal = unitPrice * quantity;

  function handleAddToCart() {
    if (!item || !selectedOutlet || !isValid) {
      return;
    }
    cart.addItem(
      { id: selectedOutlet.id, name: selectedOutlet.name },
      item,
      { selectedModifiers, quantity },
    );
    router.back();
  }

  return (
    <View style={styles.screen}>
      {/* Unlike the tab screens (whose top inset TabScreenShell applies),
          this is a pushed stack route outside that subtree — it needs its
          own top-inset handling for the same reason TabScreenShell does:
          headerShown: false means nothing else consumes it. */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={SPACING_SCALE[2]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={BRAND_COLORS.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Customize</Text>
      </View>

      {state.status === "loading" && (
        <View style={styles.centered}>
          <ActivityIndicator color={BRAND_COLORS.teal} />
        </View>
      )}

      {state.status === "error" && (
        <View style={styles.centered}>
          <Text style={styles.message}>Could not load this item. Try again shortly.</Text>
        </View>
      )}

      {item && (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.imageContainer} />

            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.basePrice}>RM{item.price.toFixed(2)}</Text>

            {item.modifierGroups.map((group) => (
              <ModifierGroupSelector
                key={group.id}
                group={group}
                selectedQuantities={selections}
                onChangeQuantity={(optionId, nextQuantity) =>
                  handleChangeQuantity(group, optionId, nextQuantity)
                }
              />
            ))}

            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Quantity</Text>
              <QuantityStepper quantity={quantity} onChange={setQuantity} />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.addToCartButton,
                !isValid && styles.addToCartButtonDisabled,
                pressed && isValid && styles.addToCartButtonPressed,
              ]}
              onPress={handleAddToCart}
              disabled={!isValid}
              accessibilityRole="button"
              accessibilityLabel="Add to cart"
            >
              <Text style={styles.addToCartButtonText}>
                {isValid ? `Add to cart · RM${displayTotal.toFixed(2)}` : "Select required options"}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const customerSpacing = SPACING_BY_APP.customer;
const IMAGE_HEIGHT = 180;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_COLORS.cream,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING_SCALE[2], // 12px
    paddingHorizontal: customerSpacing.cardPaddingPx,
    paddingVertical: SPACING_SCALE[1], // 8px
  },
  backButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: MENU_HEADER_TITLE_PX,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: customerSpacing.cardPaddingPx,
  },
  message: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
    textAlign: "center",
  },
  content: {
    padding: customerSpacing.cardPaddingPx,
    gap: customerSpacing.elementGapPx,
  },
  imageContainer: {
    height: IMAGE_HEIGHT,
    borderRadius: RADIUS.compact,
    backgroundColor: BRAND_COLORS.peach,
  },
  name: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  description: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
  },
  basePrice: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  quantitySection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quantityLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  footer: {
    padding: customerSpacing.cardPaddingPx,
  },
  addToCartButton: {
    backgroundColor: BRAND_COLORS.teal,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: LARGE_BUTTON_PADDING_VERTICAL_PX,
  },
  // Dimmed rather than recolored — a differently-colored disabled state
  // would need its own text-color pairing to stay readable; opacity keeps
  // the same teal/white pairing safely legible at reduced emphasis.
  addToCartButtonDisabled: {
    opacity: 0.5,
  },
  addToCartButtonPressed: {
    backgroundColor: BRAND_COLORS.tealDark,
  },
  addToCartButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.white,
  },
});
