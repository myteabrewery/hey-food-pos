import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { OrderWithItems } from "@hey-food/api-client";
import { OrderStatus } from "@hey-food/shared-types";
import { BRAND_COLORS, FONT_FAMILY, ORDER_STATUS_META, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

export interface OrderProgressCardProps {
  order: OrderWithItems;
  outletName: string;
}

// The 5-step lifecycle per dev spec Section 3 (Paid -> Received ->
// Preparing -> Ready -> Collected) — not V1's 3-step Order Status mockup,
// per explicit instruction for this pass.
const STEPS: OrderStatus[] = [
  OrderStatus.Paid,
  OrderStatus.Received,
  OrderStatus.Preparing,
  OrderStatus.Ready,
  OrderStatus.Collected,
];

const STEP_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: "Pending",
  [OrderStatus.Paid]: "Paid",
  [OrderStatus.Received]: "Received",
  [OrderStatus.Preparing]: "Preparing",
  [OrderStatus.Ready]: "Ready",
  [OrderStatus.Collected]: "Collected",
  [OrderStatus.Completed]: "Completed",
  [OrderStatus.Cancelled]: "Cancelled",
};

// Component-specific dimension, not tokenized — same convention as
// MenuItemRow's IMAGE_SIZE.
const STEP_CIRCLE_SIZE = 28;

/**
 * Home's conditional "Order in progress" section (docs/customer-app-
 * screens-v2.md Section 3.7). Non-interactive for this pass — the doc
 * says tapping "can still navigate to a fuller Order Status detail if
 * useful," but no such screen exists yet and building one is out of
 * scope here, so this card doesn't respond to taps.
 *
 * Icons are deliberately simple, not per-step custom icons like V1's
 * 3-step mockup ("flame for preparing", etc.): completed steps get a
 * checkmark, the active step is just a filled circle, upcoming steps are
 * outlined/muted. Progress bar fill = (currentStepIndex + 1) / totalSteps,
 * a reasonable convention since the doc doesn't specify the exact
 * semantics.
 */
export function OrderProgressCard({ order, outletName }: OrderProgressCardProps) {
  const currentIndex = STEPS.indexOf(order.status);

  // Defensive: if the order's status somehow isn't one of the 5 tracked
  // steps (e.g. "pending", "completed", "cancelled"), there's nothing
  // sensible to render as "in progress" — this stub's mock order always
  // uses "preparing", so this branch isn't exercised today, but a real
  // active-order fetch could return other statuses.
  if (currentIndex === -1) {
    return null;
  }

  const meta = ORDER_STATUS_META[order.status];
  const progressFraction = (currentIndex + 1) / STEPS.length;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.orderId}>#{order.displayId}</Text>
          <Text style={styles.outletName}>{outletName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.background }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressFraction * 100}%` }]} />
      </View>

      <View style={styles.stepperRow}>
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <Fragment key={step}>
              <View style={styles.stepColumn}>
                <View
                  style={[
                    styles.stepCircle,
                    (isCompleted || isActive) && styles.stepCircleFilled,
                  ]}
                >
                  {isCompleted && (
                    <MaterialCommunityIcons name="check" size={14} color={BRAND_COLORS.white} />
                  )}
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                  {STEP_LABELS[step]}
                </Text>
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[styles.connector, index < currentIndex && styles.connectorFilled]}
                />
              )}
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

const customerSpacing = SPACING_BY_APP.customer;

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND_COLORS.white,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: RADIUS.md,
    padding: customerSpacing.cardPaddingPx,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderId: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  outletName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
    marginTop: SPACING_SCALE[0], // 4px
  },
  statusBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING_SCALE[1], // 8px
    paddingVertical: SPACING_SCALE[0], // 4px
  },
  statusBadgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "600",
  },
  progressTrack: {
    height: SPACING_SCALE[0], // 4px
    borderRadius: RADIUS.pill,
    backgroundColor: BRAND_COLORS.soft,
    marginTop: customerSpacing.cardPaddingPx,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: BRAND_COLORS.teal,
    borderRadius: RADIUS.pill,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: customerSpacing.cardPaddingPx,
  },
  stepColumn: {
    alignItems: "center",
    gap: SPACING_SCALE[0], // 4px
  },
  stepCircle: {
    width: STEP_CIRCLE_SIZE,
    height: STEP_CIRCLE_SIZE,
    borderRadius: STEP_CIRCLE_SIZE / 2,
    backgroundColor: BRAND_COLORS.soft,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleFilled: {
    backgroundColor: BRAND_COLORS.teal,
    borderWidth: 0,
  },
  stepLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "400",
    color: BRAND_COLORS.muted,
    textAlign: "center",
  },
  stepLabelActive: {
    color: BRAND_COLORS.ink,
    fontWeight: "600",
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: BRAND_COLORS.line,
    marginTop: STEP_CIRCLE_SIZE / 2 - 1, // align with circle's vertical center
  },
  connectorFilled: {
    backgroundColor: BRAND_COLORS.teal,
  },
});
