import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { CreateOrderRequest } from "@hey-food/api-client";
import { BRAND_COLORS, FONT_FAMILY, LARGE_BUTTON_PADDING_VERTICAL_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import { createOrder } from "../api/orders";
import { useCart } from "../cart/cart-context";
import { CheckoutLineItem } from "../components/CheckoutLineItem";
import { OutletConfirmationBanner } from "../components/OutletConfirmationBanner";

/**
 * Placeholder — same reasoning as the old CheckoutScreen: dev spec's
 * actual service fee is computed server-side, not reinvented here. Still
 * folded into the single total shown, even though v2 Section 5 wants
 * only "a total row" here (not a full subtotal/fee breakdown) — the
 * number stays honest, only the line-by-line display was simplified.
 */
const MOCK_SERVICE_FEE = 2.0;

// Drag handle is a static graphic, not a real drag gesture — see
// app/cart-modal.tsx for why. Dimensions are component-specific literals.
const DRAG_HANDLE_WIDTH = 40;
const DRAG_HANDLE_HEIGHT = 4;

/**
 * Cart bottom sheet content — docs/customer-app-screens-v2.md Section 5.
 * Rendered inside app/cart-modal.tsx's backdrop+sheet shell. Replaces the
 * old dedicated Checkout screen as the primary entry point; "Continue to
 * payment" is where that screen's payment-submission responsibility now
 * lives — same stub behavior as before (validates + logs a POST /orders
 * request, no real payment flow), then dismisses the sheet.
 *
 * The mandatory outlet-confirmation banner still appears here — not
 * dropped in the restructuring.
 */
export function CartSheetScreen() {
  const cart = useCart();
  const router = useRouter();

  if (!cart.outlet || cart.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.dragHandle} />
        <Text style={styles.emptyMessage}>Your cart is empty.</Text>
      </View>
    );
  }

  const total = cart.subtotal + MOCK_SERVICE_FEE;

  function handleContinueToPayment() {
    if (!cart.outlet) {
      return;
    }

    const request: CreateOrderRequest = {
      outletId: cart.outlet.id,
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        ...(item.notes ? { notes: item.notes } : {}),
        // TEMPORARY mechanical patch for docs/product-customization-v2.md's
        // selectedModifierOptionIds: string[] -> selectedModifierOptions:
        // Array<{ optionId, quantity }> change. `quantity` is hardcoded to
        // 1 here — CartItemModifier doesn't track a per-option quantity
        // yet (no quantity-stepper UI exists on any modifier option
        // either), so this isn't a real v2 update, just enough to keep
        // the request shape valid. Stage 3.5 adds real quantity tracking
        // for quantityEnabled options.
        selectedModifierOptions: item.modifiers.map((modifier) => ({
          optionId: modifier.optionId,
          quantity: 1,
        })),
      })),
    };

    createOrder(request);
    // Temporary default: dismiss the sheet back to whatever tab was open.
    // Once a real payment step (Billplz webview) and an Order Status view
    // exist, this should navigate there instead of just closing the sheet.
    router.back();
  }

  return (
    <View style={styles.container}>
      <View style={styles.dragHandle} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <OutletConfirmationBanner outletName={cart.outlet.name} />

        <View style={styles.lineItems}>
          {cart.items.map((item, index) => (
            <View key={item.id}>
              <CheckoutLineItem item={item} />
              {index < cart.items.length - 1 && <View style={styles.itemDivider} />}
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>RM{total.toFixed(2)}</Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [styles.continueButton, pressed && styles.continueButtonPressed]}
          onPress={handleContinueToPayment}
          accessibilityRole="button"
          accessibilityLabel="Continue to payment"
        >
          <Text style={styles.continueButtonText}>
            Continue to payment · RM{total.toFixed(2)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const customerSpacing = SPACING_BY_APP.customer;

const styles = StyleSheet.create({
  container: {
    paddingBottom: customerSpacing.cardPaddingPx,
  },
  emptyContainer: {
    padding: customerSpacing.cardPaddingPx,
    alignItems: "center",
  },
  dragHandle: {
    width: DRAG_HANDLE_WIDTH,
    height: DRAG_HANDLE_HEIGHT,
    borderRadius: RADIUS.pill,
    backgroundColor: BRAND_COLORS.line,
    alignSelf: "center",
    marginTop: SPACING_SCALE[1], // 8px
    marginBottom: SPACING_SCALE[1], // 8px
  },
  scrollContent: {
    padding: customerSpacing.cardPaddingPx,
    gap: customerSpacing.elementGapPx,
  },
  lineItems: {
    gap: customerSpacing.cardPaddingPx,
  },
  itemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BRAND_COLORS.line,
    marginTop: customerSpacing.cardPaddingPx,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  totalValue: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  buttonContainer: {
    paddingHorizontal: customerSpacing.cardPaddingPx,
  },
  continueButton: {
    backgroundColor: BRAND_COLORS.teal,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: LARGE_BUTTON_PADDING_VERTICAL_PX,
  },
  continueButtonPressed: {
    backgroundColor: BRAND_COLORS.tealDark,
  },
  continueButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.white,
  },
  emptyMessage: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
    marginTop: customerSpacing.cardPaddingPx,
  },
});
