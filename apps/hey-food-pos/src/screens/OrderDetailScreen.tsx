import { useEffect, useState } from "react";
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { OrderWithItems, PosOrderStatus } from "@hey-food/api-client";
import { BRAND_COLORS, DANGER_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, ORDER_STATUS_META, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import { CancelOrderModal } from "../components/CancelOrderModal";
import { OrderItemLine } from "../components/OrderItemLine";
import { formatClockTime, totalItemCount } from "../orders/format";
import type { StaffCancelRequest } from "../orders/transitions";
import { primaryActionFor } from "../orders/transitions";

export interface OrderDetailScreenProps {
  order: OrderWithItems;
  onBack: () => void;
  onAdvance: (nextStatus: PosOrderStatus) => void;
  onCancel: (request: StaffCancelRequest) => void;
}

// Content column cap — on a wide tablet a full-bleed item list would put a
// modifier's name and its quantity hundreds of pixels apart; a capped,
// centered column keeps them close. Below the cap it simply fills the width.
const CONTENT_MAX_WIDTH = 900;

// The order ID is the biggest thing on this screen ("large, per POS's
// bold/high-contrast style") — 1.5x the queue card's display size, derived
// from the token rather than a new literal so it follows the scale if that
// ever changes.
const ORDER_ID_FONT_SIZE = TYPE_SCALE.display.pos * 1.5;

/**
 * Order Detail (docs/hey-food-developer-spec-v1.md Section 5.2) — reached by
 * tapping a card in the queue; the queue itself is untouched and PosShell
 * shows it again on Back. Everything a staff member needs to make the order
 * without the queue card's summary: a large order ID, every item with EVERY
 * selected modifier (the reason this screen exists — see OrderItemLine), the
 * one primary action for the order's current status, and Cancel.
 *
 * Layout decisions (judgment calls, flagged in docs/STATUS.md):
 * - Cancel sits top-right, far from the primary action at the bottom, and is
 *   always confirmed in a modal — a destructive action shouldn't share a
 *   thumb-zone with the button pressed dozens of times a shift.
 * - The primary action lives in a fixed footer outside the scrolling list, so
 *   a long order never pushes it off screen.
 * - After an action that ends the order's life in the queue (Collect, Cancel)
 *   PosShell returns to the queue on its own; Start / Ready keep staff on the
 *   screen, where the button simply advances to the next action.
 *
 * `order` arrives already updated by PosShell on every action — this
 * component holds no order state of its own, only whether the cancel dialog
 * is open.
 *
 * Actions here are saved to the server exactly like the queue cards' (optimistic,
 * rolled back with an error if the save fails — see useLiveOrders). STILL A
 * STUB: "Call customer" doesn't actually notify anyone (no notification
 * service yet, so `ready` sends no push or SMS); the caption under the button
 * says so on screen rather than leaving staff to assume a customer was buzzed.
 */
export function OrderDetailScreen({ order, onBack, onAdvance, onCancel }: OrderDetailScreenProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const meta = ORDER_STATUS_META[order.status];
  const action = primaryActionFor(order.status);
  const itemCount = totalItemCount(order);

  // Android hardware/gesture Back returns to the queue (an open cancel
  // dialog handles its own Back first, via the Modal's onRequestClose).
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.column}>
          <View style={styles.topRow}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back to queue"
            >
              <Text style={styles.backButtonText}>← QUEUE</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.cancelEntryButton, pressed && styles.cancelEntryButtonPressed]}
              onPress={() => setCancelOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Cancel order ${order.displayId}`}
            >
              <Text style={styles.cancelEntryButtonText}>CANCEL ORDER</Text>
            </Pressable>
          </View>

          <View style={styles.headerCard}>
            <View style={styles.idRow}>
              <Text style={styles.displayId} accessibilityRole="header">
                #{order.displayId}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: meta.background }]}>
                <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
              </View>
            </View>
            <Text style={styles.headerMeta}>
              {itemCount} {itemCount === 1 ? "item" : "items"} · Placed {formatClockTime(order.createdAt)}
            </Text>
          </View>

          <View style={styles.itemsCard}>
            <Text style={styles.sectionLabel}>ITEMS ({itemCount})</Text>
            {order.items.map((item, index) => (
              <View key={item.id} style={index > 0 && styles.itemDivided}>
                <OrderItemLine item={item} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {action && (
        <View style={styles.footer}>
          <View style={styles.footerColumn}>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
              onPress={() => onAdvance(action.nextStatus)}
              accessibilityRole="button"
              accessibilityLabel={`${action.detailLabel} for order ${order.displayId}`}
            >
              <Text style={styles.primaryButtonText}>{action.detailLabel.toUpperCase()}</Text>
            </Pressable>
            {action.nextStatus === "ready" && (
              <Text style={styles.stubCaption}>Demo build: the customer is not actually notified yet.</Text>
            )}
          </View>
        </View>
      )}

      {cancelOpen && (
        <CancelOrderModal
          displayId={order.displayId}
          onDismiss={() => setCancelOpen(false)}
          onConfirm={(request) => {
            setCancelOpen(false);
            onCancel(request);
          }}
        />
      )}
    </View>
  );
}

const posSpacing = SPACING_BY_APP.pos;
// The primary action is pressed constantly, one-handed, mid-rush: taller than
// the 48px tap minimum every other POS button uses.
const PRIMARY_BUTTON_MIN_HEIGHT = MIN_TAP_TARGET_PX.pos + 16;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: posSpacing.tapPaddingPx,
    alignItems: "center",
  },
  column: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    gap: posSpacing.tapPaddingPx,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING_SCALE[2], // 12px
  },
  backButton: {
    minHeight: MIN_TAP_TARGET_PX.pos,
    paddingHorizontal: SPACING_SCALE[3], // 16px
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: BRAND_COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    backgroundColor: BRAND_COLORS.onNavyMuted,
  },
  backButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    letterSpacing: 0.5,
  },
  // The design system's "Secondary" button treatment (Section 6 lists Cancel
  // as a Secondary action): a tinted, low-emphasis entry point. The filled
  // destructive button only appears inside the confirmation dialog.
  cancelEntryButton: {
    minHeight: MIN_TAP_TARGET_PX.pos,
    paddingHorizontal: SPACING_SCALE[3], // 16px
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: DANGER_COLORS.tint,
    backgroundColor: DANGER_COLORS.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelEntryButtonPressed: {
    opacity: 0.8,
  },
  cancelEntryButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "800",
    color: DANGER_COLORS.solid,
    letterSpacing: 0.5,
  },
  headerCard: {
    backgroundColor: BRAND_COLORS.white,
    borderRadius: RADIUS.sm,
    padding: posSpacing.tapPaddingPx,
    gap: SPACING_SCALE[0], // 4px
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING_SCALE[2], // 12px
  },
  displayId: {
    fontFamily: FONT_FAMILY,
    fontSize: ORDER_ID_FONT_SIZE,
    fontWeight: "800",
    color: BRAND_COLORS.ink,
  },
  statusBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING_SCALE[2], // 12px
    paddingVertical: SPACING_SCALE[1], // 8px
  },
  statusBadgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "800",
  },
  headerMeta: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "600",
    color: BRAND_COLORS.muted,
  },
  itemsCard: {
    backgroundColor: BRAND_COLORS.white,
    borderRadius: RADIUS.sm,
    padding: posSpacing.tapPaddingPx,
    gap: posSpacing.tapPaddingPx,
  },
  sectionLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "800",
    letterSpacing: 1,
    color: BRAND_COLORS.muted,
  },
  itemDivided: {
    paddingTop: posSpacing.tapPaddingPx,
    borderTopWidth: 2,
    borderTopColor: BRAND_COLORS.line,
  },
  footer: {
    paddingHorizontal: posSpacing.tapPaddingPx,
    paddingTop: SPACING_SCALE[2], // 12px
    paddingBottom: posSpacing.tapPaddingPx,
    alignItems: "center",
  },
  footerColumn: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    gap: SPACING_SCALE[1], // 8px
  },
  primaryButton: {
    minHeight: PRIMARY_BUTTON_MIN_HEIGHT,
    borderRadius: RADIUS.md,
    backgroundColor: BRAND_COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING_SCALE[3], // 16px
  },
  primaryButtonPressed: {
    backgroundColor: BRAND_COLORS.tealDark,
  },
  primaryButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  stubCaption: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "600",
    color: BRAND_COLORS.onNavyMuted,
    textAlign: "center",
  },
});
