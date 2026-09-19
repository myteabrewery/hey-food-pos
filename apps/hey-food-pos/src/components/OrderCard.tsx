import { Pressable, StyleSheet, Text, View } from "react-native";

import type { OrderWithItems } from "@hey-food/api-client";
import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, ORDER_STATUS_META, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import { formatClockTime, totalItemCount } from "../orders/format";

export interface OrderCardProps {
  order: OrderWithItems;
  /** Label for the stage-appropriate action ("Start" / "Ready" / "Collect"). */
  actionLabel: string;
  onPressAction: () => void;
  /** Tapping anywhere else on the card opens the Order Detail screen. */
  onPressCard: () => void;
}

/**
 * The Order Card, per docs/hey-food-design-system-v1.md Section 6: order
 * ID (bold, prominent), item count, timestamp, status badge, and the
 * stage-appropriate primary action — same component POS and HQ share,
 * POS's own density/weight per docs Section 3/4 applied here via
 * TYPE_SCALE's `.pos` column and SPACING_BY_APP.pos.
 *
 * `radius-sm` for the card itself (Section 5's table names "POS queue
 * cards" as a radius-sm user, the "utilitarian feel"), but `radius-md`
 * for the action button (Section 6's generic button rule, no POS-specific
 * override there).
 *
 * The whole card is also a button that opens the Order Detail screen (dev
 * spec Section 5.2); the inline action button stays, as its own nested
 * Pressable, so the common one-tap Start/Ready/Collect flow on the queue is
 * unchanged. A nested Pressable takes the touch for itself, so tapping the
 * action button does NOT also open the detail.
 */
export function OrderCard({ order, actionLabel, onPressAction, onPressCard }: OrderCardProps) {
  const meta = ORDER_STATUS_META[order.status];
  const itemCount = totalItemCount(order);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPressCard}
      accessibilityRole="button"
      accessibilityLabel={`Open details for order ${order.displayId}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.displayId}>#{order.displayId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.background }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      <Text style={styles.itemSummary}>
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.timestamp}>{formatClockTime(order.createdAt)}</Text>
        <Text style={styles.detailsHint}>DETAILS ›</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
        onPress={onPressAction}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel} order ${order.displayId}`}
      >
        <Text style={styles.actionButtonText}>{actionLabel.toUpperCase()}</Text>
      </Pressable>
    </Pressable>
  );
}

const posSpacing = SPACING_BY_APP.pos;

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND_COLORS.white,
    borderRadius: RADIUS.sm,
    padding: posSpacing.tapPaddingPx,
    gap: SPACING_SCALE[0], // 4px
  },
  cardPressed: {
    opacity: 0.85,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailsHint: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: BRAND_COLORS.teal,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING_SCALE[1], // 8px
  },
  displayId: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.display.pos,
    fontWeight: "800",
    color: BRAND_COLORS.ink,
  },
  statusBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING_SCALE[1], // 8px
    paddingVertical: SPACING_SCALE[0], // 4px
  },
  statusBadgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "700",
  },
  itemSummary: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "600",
    color: BRAND_COLORS.ink,
  },
  timestamp: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "600",
    color: BRAND_COLORS.muted,
  },
  actionButton: {
    marginTop: SPACING_SCALE[1], // 8px
    minHeight: MIN_TAP_TARGET_PX.pos,
    borderRadius: RADIUS.md,
    backgroundColor: BRAND_COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPressed: {
    backgroundColor: BRAND_COLORS.tealDark,
  },
  actionButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    letterSpacing: 0.5,
  },
});
