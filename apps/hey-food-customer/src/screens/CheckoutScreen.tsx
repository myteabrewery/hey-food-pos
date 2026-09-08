import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { CreateOrderRequest } from "@hey-food/api-client";
import { BRAND_COLORS, FONT_FAMILY, LARGE_BUTTON_PADDING_VERTICAL_PX, RADIUS, SPACING_BY_APP, TYPE_SCALE } from "@hey-food/design-tokens";

import { createOrder } from "../api/orders";
import { useCart } from "../cart/cart-context";
import { CheckoutLineItem } from "../components/CheckoutLineItem";
import { OutletConfirmationBanner } from "../components/OutletConfirmationBanner";
import { TotalsBlock } from "../components/TotalsBlock";

/**
 * Placeholder — dev spec's actual service fee is computed server-side
 * (Order.serviceFee), not reinvented here. This is only for showing the
 * customer an estimate on this screen before submitting; the real value
 * would come back on the created Order once the backend exists.
 */
const MOCK_SERVICE_FEE = 2.0;

/**
 * Customer App Checkout screen — docs/customer-app-screens-v1.md's
 * "Checkout Screen" section.
 *
 * The outlet confirmation banner is rendered unconditionally whenever
 * there's a cart to check out — never treated as optional/skippable UI,
 * per the blueprint's guard against ordering-from-the-wrong-outlet.
 *
 * "Pay" only validates and logs a POST /orders request (api/orders.ts) —
 * no real payment flow, no post-submit navigation. Reachable only by
 * direct route navigation right now; Menu has no "view cart" affordance
 * yet (see MenuScreen's header comment).
 */
export function CheckoutScreen() {
  const cart = useCart();

  if (!cart.outlet || cart.items.length === 0) {
    return (
      <View style={styles.screen}>
        <Text style={styles.emptyMessage}>Your cart is empty.</Text>
      </View>
    );
  }

  const total = cart.subtotal + MOCK_SERVICE_FEE;

  function handlePay() {
    if (!cart.outlet) {
      return;
    }

    const request: CreateOrderRequest = {
      outletId: cart.outlet.id,
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        ...(item.notes ? { notes: item.notes } : {}),
      })),
    };

    createOrder(request);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <OutletConfirmationBanner outletName={cart.outlet.name} />

        <View style={styles.lineItems}>
          {cart.items.map((item, index) => (
            <View key={item.productId}>
              <CheckoutLineItem item={item} />
              {index < cart.items.length - 1 && <View style={styles.itemDivider} />}
            </View>
          ))}
        </View>

        <TotalsBlock subtotal={cart.subtotal} serviceFee={MOCK_SERVICE_FEE} total={total} />
      </ScrollView>

      <View style={styles.payButtonContainer}>
        <Pressable
          style={({ pressed }) => [styles.payButton, pressed && styles.payButtonPressed]}
          onPress={handlePay}
          accessibilityRole="button"
          accessibilityLabel="Pay"
        >
          <Text style={styles.payButtonText}>Pay RM{total.toFixed(2)}</Text>
        </Pressable>
      </View>
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
    gap: customerSpacing.elementGapPx,
  },
  lineItems: {
    gap: customerSpacing.cardPaddingPx,
  },
  // Was a border role incorrectly using a background-color-filled thin
  // box — fixed to an actual border property, not just the color.
  itemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BRAND_COLORS.line,
    marginTop: customerSpacing.cardPaddingPx,
  },
  payButtonContainer: {
    padding: customerSpacing.cardPaddingPx,
  },
  payButton: {
    backgroundColor: BRAND_COLORS.teal,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: LARGE_BUTTON_PADDING_VERTICAL_PX,
  },
  payButtonPressed: {
    backgroundColor: BRAND_COLORS.tealDark,
  },
  payButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.white,
  },
  emptyMessage: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
    textAlign: "center",
    textAlignVertical: "center",
  },
});
