import { useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { OrderWithItems } from "@hey-food/api-client";
import type { StaffUser } from "@hey-food/shared-types";
import { OrderStatus } from "@hey-food/shared-types";
import type { PosOrderStatus } from "@hey-food/api-client";
import { BRAND_COLORS, FONT_FAMILY, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import { OrderCard } from "../components/OrderCard";
import { createMockOrders } from "../mock/orders";

export interface QueueScreenProps {
  staff: StaffUser;
  outletName: string;
}

interface ColumnConfig {
  key: string;
  title: string;
  statusFilter: OrderStatus;
  actionLabel: string;
  nextStatus: PosOrderStatus;
}

// Maps each PosOrderStatus transition to the Order timestamp field it sets
// — mirrors what a real PATCH /pos/orders/:id/status call would stamp
// server-side (dev spec Section 3), even though this is a local-only
// stand-in.
const TIMESTAMP_FIELD_BY_STATUS: Record<PosOrderStatus, "preparingAt" | "readyAt" | "collectedAt"> = {
  preparing: "preparingAt",
  ready: "readyAt",
  collected: "collectedAt",
};

// "New" is a UI label, not a real OrderStatus — dev spec Section 5.5-5.10
// describes Preparing/Ready/Completed as "views into the same queue,
// filtered by status," and the first such view is orders in "received"
// status (POS has received the order but staff hasn't started it yet).
// Judgment call, flagged: three columns per explicit instruction for this
// pass, even though docs/hey-food-design-system-v1.md's own Tabs
// component entry describes this same New/Preparing/Ready filtering as a
// single-list-plus-tabs pattern rather than three simultaneous columns.
const COLUMNS: ColumnConfig[] = [
  { key: "new", title: "New", statusFilter: OrderStatus.Received, actionLabel: "Start", nextStatus: "preparing" },
  { key: "preparing", title: "Preparing", statusFilter: OrderStatus.Preparing, actionLabel: "Ready", nextStatus: "ready" },
  { key: "ready", title: "Ready", statusFilter: OrderStatus.Ready, actionLabel: "Collect", nextStatus: "collected" },
];

// Minimum column width — below this, an order card's oversized display-
// scale ID and full-width action button start feeling cramped. On a
// typical Android tablet in landscape this comfortably fits all three
// columns with no scrolling; on the phone this pass was actually tested
// on, only about one column is visible at a time and the queue must be
// scrolled horizontally — noted as this pass's real limitation, not
// fixed here (real tablet testing is future work).
const MIN_COLUMN_WIDTH = 300;

/**
 * The Order Queue (docs/hey-food-developer-spec-v1.md Section 5.1) — POS's
 * main screen. Three status-filtered columns per explicit instruction for
 * this pass (see COLUMNS' comment for how this differs from the design
 * system doc's own Tabs suggestion).
 *
 * STUB DATA: orders come from mock/orders.ts, not a live order feed —
 * there's no real order-creation endpoint yet (blocked on auth). Tapping
 * a card's action button transitions its status in local component state
 * only; nothing is synced anywhere. Section 5.1's real-time
 * (websocket/poll), new-order sound+visual alert, and offline-queueing
 * requirements are all explicitly out of scope for this pass — there's
 * no live connection to be online/offline about yet.
 */
export function QueueScreen({ staff, outletName }: QueueScreenProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>(createMockOrders);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const columnWidth = Math.max(MIN_COLUMN_WIDTH, width / COLUMNS.length);

  function handleAdvance(order: OrderWithItems, column: ColumnConfig) {
    const timestampField = TIMESTAMP_FIELD_BY_STATUS[column.nextStatus];
    const now = new Date().toISOString();

    setOrders((prev) =>
      prev.map((existing) =>
        existing.id === order.id
          ? { ...existing, status: column.nextStatus, [timestampField]: now }
          : existing,
      ),
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.outletName}>{outletName}</Text>
          <Text style={styles.staffName}>{staff.name}</Text>
        </View>

        {/* STUB — no real connectivity check exists yet; Section 5.1's
            offline-queueing behavior is out of scope this pass, so this
            always reads "Online". */}
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>ONLINE</Text>
        </View>
      </View>

      <ScrollView horizontal contentContainerStyle={styles.columnsRow} showsHorizontalScrollIndicator>
        {COLUMNS.map((column) => {
          const columnOrders = orders.filter((order) => order.status === column.statusFilter);

          return (
            <View key={column.key} style={[styles.column, { width: columnWidth }]}>
              <Text style={styles.columnTitle}>
                {column.title.toUpperCase()} ({columnOrders.length})
              </Text>

              <ScrollView contentContainerStyle={styles.cardList}>
                {columnOrders.length === 0 ? (
                  <Text style={styles.emptyColumnText}>No orders</Text>
                ) : (
                  columnOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      actionLabel={column.actionLabel}
                      onPressAction={() => handleAdvance(order, column)}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const posSpacing = SPACING_BY_APP.pos;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_COLORS.navy,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: posSpacing.tapPaddingPx,
    paddingVertical: posSpacing.tapPaddingPx,
  },
  outletName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
  },
  staffName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "600",
    color: BRAND_COLORS.onNavyMuted,
    marginTop: SPACING_SCALE[0], // 4px
  },
  onlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING_SCALE[0], // 4px
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_COLORS.teal,
  },
  onlineText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.pos,
    fontWeight: "700",
    color: BRAND_COLORS.onNavyMuted,
    letterSpacing: 1,
  },
  columnsRow: {
    paddingHorizontal: posSpacing.tapPaddingPx,
    gap: posSpacing.tapPaddingPx,
    flexGrow: 1,
  },
  column: {
    gap: posSpacing.queueCardGapPx,
  },
  columnTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "800",
    color: BRAND_COLORS.white,
    letterSpacing: 1,
    marginBottom: SPACING_SCALE[0], // 4px
  },
  cardList: {
    gap: posSpacing.queueCardGapPx,
    paddingBottom: posSpacing.tapPaddingPx,
  },
  emptyColumnText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.pos,
    fontWeight: "600",
    color: BRAND_COLORS.onNavyMuted,
  },
});
