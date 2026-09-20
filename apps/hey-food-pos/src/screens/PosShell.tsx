import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { OutletProductOverride } from "@hey-food/shared-types";
import type { PosOrderStatus } from "@hey-food/api-client";
import { BRAND_COLORS } from "@hey-food/design-tokens";

import { TopBar } from "../components/TopBar";
import type { PosScreen } from "../navigation";
import { createMockOverrides, createMockProducts } from "../mock/products";
import { SyncNotice } from "../components/SyncNotice";
import type { StaffCancelRequest } from "../orders/transitions";
import { advanceOrder, cancelOrder } from "../orders/transitions";
import { useLiveOrders } from "../orders/useLiveOrders";
import { QueueScreen } from "./QueueScreen";
import { OrderDetailScreen } from "./OrderDetailScreen";
import { MenuAvailabilityScreen } from "./MenuAvailabilityScreen";
import { DailySummaryScreen } from "./DailySummaryScreen";

export interface PosShellProps {
  /** The outlet this device is bound to (stub: from the mock session). */
  outletId: string;
  staffName: string;
  outletName: string;
}

/**
 * Everything shown once logged in. Owns the state each screen mocks
 * (orders, product availability overrides) up here rather than inside
 * each screen component — QueueScreen and MenuAvailabilityScreen unmount
 * when a different screen is active (only one renders at a time), so any
 * state they owned themselves would reset on every navigation. Lifting it
 * here is what makes "toggle availability, switch to Queue, switch back,
 * see it stuck" actually work.
 *
 * `products` itself doesn't need lifting — it's a fixed catalog for this
 * pass, never mutated, so re-deriving it from mock/products.ts on every
 * PosShell mount is harmless (and there's exactly one mount, for the
 * lifetime of a login session).
 *
 * The order detail screen is not a fourth top-level screen: it's a view
 * inside "queue" (`selectedOrderId` set = detail shown instead of the
 * columns; cleared = queue again). Only the id is stored, and the order is
 * looked up from `orders` on each render, so the detail always reflects the
 * latest status without a second copy of the order to keep in sync. Choosing
 * any top-bar destination (including Queue itself) closes it.
 */
export function PosShell({ outletId, staffName, outletName }: PosShellProps) {
  const insets = useSafeAreaInsets();
  const [activeScreen, setActiveScreen] = useState<PosScreen>("queue");
  // STAGE A: orders come from the backend (polled), read-only; staff actions
  // stay local overrides on top — see useLiveOrders. Same `orders` /
  // `setOrders` shape the screens always had.
  const { orders, setOrders, connection, errorMessage } = useLiveOrders(outletId);
  const [overrides, setOverrides] = useState<OutletProductOverride[]>(createMockOverrides);
  const [products] = useState(createMockProducts);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  function handleNavigate(screen: PosScreen) {
    setSelectedOrderId(null);
    setActiveScreen(screen);
  }

  // Stable identity: OrderDetailScreen re-subscribes its hardware-Back
  // listener whenever this changes.
  const closeDetail = useCallback(() => setSelectedOrderId(null), []);

  function handleAdvanceSelected(nextStatus: PosOrderStatus) {
    if (!selectedOrder) {
      return;
    }
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((order) => (order.id === selectedOrder.id ? advanceOrder(order, nextStatus, now) : order)),
    );
    // Collected orders leave the queue entirely — nothing left to do on
    // their detail screen. Start / Ready keep staff here for the next step.
    if (nextStatus === "collected") {
      setSelectedOrderId(null);
    }
  }

  function handleCancelSelected(request: StaffCancelRequest) {
    if (!selectedOrder) {
      return;
    }
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((order) => (order.id === selectedOrder.id ? cancelOrder(order, request, now) : order)),
    );
    setSelectedOrderId(null);
  }

  return (
    <View style={[styles.shell, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TopBar
        outletName={outletName}
        staffName={staffName}
        activeScreen={activeScreen}
        connection={connection}
        onNavigate={handleNavigate}
      />
      {activeScreen === "queue" && <SyncNotice connection={connection} errorMessage={errorMessage} />}

      <View style={styles.body}>
        {activeScreen === "queue" &&
          (selectedOrder ? (
            <OrderDetailScreen
              order={selectedOrder}
              onBack={closeDetail}
              onAdvance={handleAdvanceSelected}
              onCancel={handleCancelSelected}
            />
          ) : (
            <QueueScreen orders={orders} onChangeOrders={setOrders} onOpenOrder={setSelectedOrderId} />
          ))}
        {activeScreen === "menu" && (
          <MenuAvailabilityScreen
            products={products}
            overrides={overrides}
            onChangeOverrides={setOverrides}
          />
        )}
        {activeScreen === "summary" && <DailySummaryScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: BRAND_COLORS.navy,
  },
  body: {
    flex: 1,
  },
});
