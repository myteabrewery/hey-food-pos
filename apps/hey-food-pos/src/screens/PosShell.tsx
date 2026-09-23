import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PosOrderStatus } from "@hey-food/api-client";
import { BRAND_COLORS } from "@hey-food/design-tokens";

import { ActionErrorBanner } from "../components/ActionErrorBanner";
import { TopBar } from "../components/TopBar";
import { useMenuAvailability } from "../menu/useMenuAvailability";
import type { PosScreen } from "../navigation";
import { SyncNotice } from "../components/SyncNotice";
import type { StaffCancelRequest } from "../orders/transitions";
import { useLiveOrders } from "../orders/useLiveOrders";
import { QueueScreen } from "./QueueScreen";
import { OrderDetailScreen } from "./OrderDetailScreen";
import { MenuAvailabilityScreen } from "./MenuAvailabilityScreen";
import { DailySummaryScreen } from "./DailySummaryScreen";

export interface PosShellProps {
  /** The outlet THIS SESSION operates on — resolved once at login (real staff PIN login; see App.tsx and session/session-store.ts). */
  outletId: string;
  staffName: string;
  outletName: string;
  /** Clears the local session (and best-effort revokes it server-side) and returns to LoginScreen. */
  onLogOut: () => void;
}

/**
 * Everything shown once logged in. Owns the data each screen shows (orders,
 * the outlet's menu) up here rather than inside each screen component —
 * QueueScreen and MenuAvailabilityScreen unmount when a different screen is
 * active (only one renders at a time), so any state they owned themselves
 * would reset on every navigation. Lifting it here is what makes "toggle
 * availability, switch to Queue, switch back, see it stuck" actually work.
 *
 * The order detail screen is not a fourth top-level screen: it's a view
 * inside "queue" (`selectedOrderId` set = detail shown instead of the
 * columns; cleared = queue again). Only the id is stored, and the order is
 * looked up from `orders` on each render, so the detail always reflects the
 * latest status without a second copy of the order to keep in sync. Choosing
 * any top-bar destination (including Queue itself) closes it.
 */
export function PosShell({ outletId, staffName, outletName, onLogOut }: PosShellProps) {
  const insets = useSafeAreaInsets();
  const [activeScreen, setActiveScreen] = useState<PosScreen>("queue");
  // Orders come from the backend (polled); staff actions are optimistic, saved
  // to the server, and rolled back with a visible error if that fails — see
  // useLiveOrders.
  const { orders, advance, cancel, connection, errorMessage, actionError, dismissActionError } =
    useLiveOrders(outletId);
  // The outlet's real menu, and the sold-out toggle, built on the same
  // optimistic pattern — see useMenuAvailability.
  const menu = useMenuAvailability(outletId);
  const refreshMenu = menu.refresh;
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  function handleNavigate(screen: PosScreen) {
    setSelectedOrderId(null);
    setActiveScreen(screen);
    // Opening the Menu tab re-reads the menu, so it is never older than the
    // last time staff looked at it.
    if (screen === "menu") {
      refreshMenu();
    }
  }

  // Stable identity: OrderDetailScreen re-subscribes its hardware-Back
  // listener whenever this changes.
  const closeDetail = useCallback(() => setSelectedOrderId(null), []);

  function handleAdvanceSelected(nextStatus: PosOrderStatus) {
    if (!selectedOrder) {
      return;
    }
    advance(selectedOrder, nextStatus);
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
    cancel(selectedOrder, request);
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
        onLogOut={onLogOut}
      />
      {activeScreen === "queue" && (
        <SyncNotice
          connection={connection}
          errorMessage={errorMessage}
          actionError={actionError}
          onDismissActionError={dismissActionError}
        />
      )}
      {activeScreen === "menu" && menu.actionError !== null && (
        <ActionErrorBanner message={menu.actionError} onDismiss={menu.dismissActionError} />
      )}

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
            <QueueScreen orders={orders} onAdvance={advance} onOpenOrder={setSelectedOrderId} />
          ))}
        {activeScreen === "menu" && (
          <MenuAvailabilityScreen
            items={menu.items}
            state={menu.state}
            loadError={menu.loadError}
            onSetAvailability={menu.setAvailability}
            onRetry={menu.refresh}
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
