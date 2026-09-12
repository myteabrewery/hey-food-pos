import { Pressable, StyleSheet, Text, View } from "react-native";

import type { OrderWithItems } from "@hey-food/api-client";
import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, ORDER_STATUS_META, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

export interface OrderCardProps {
  order: OrderWithItems;
  /** Label for the stage-appropriate action ("Start" / "Ready" / "Collect"). */
  actionLabel: string;
  onPressAction: () => void;
}

// Fixed clock-time format ("10:32 AM"), not a live "N min ago" countdown —
// docs/hey-food-developer-spec-v1.md's Order Card spec just says
// "Timestamp" without specifying which, and a static clock time avoids
// needing an interval timer to keep relative time fresh across this
// screen's whole lifetime. Judgment call, flagged.
function formatClockTime(iso: string): string {
  const date = new Date(iso);
  const hours24 = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}

// "Item count" reads as total quantity across all line items (e.g. "1x
// Chicken Rice + 2x Iced Tea" = 3), not the number of distinct line items
// (which would be 2) — a kitchen cares how much food to make, not how
// many rows are on the receipt. Judgment call, flagged.
function totalItemCount(order: OrderWithItems): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
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
 */
export function OrderCard({ order, actionLabel, onPressAction }: OrderCardProps) {
  const meta = ORDER_STATUS_META[order.status];
  const itemCount = totalItemCount(order);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.displayId}>#{order.displayId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.background }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      <Text style={styles.itemSummary}>
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </Text>
      <Text style={styles.timestamp}>{formatClockTime(order.createdAt)}</Text>

      <Pressable
        style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
        onPress={onPressAction}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel} order ${order.displayId}`}
      >
        <Text style={styles.actionButtonText}>{actionLabel.toUpperCase()}</Text>
      </Pressable>
    </View>
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
