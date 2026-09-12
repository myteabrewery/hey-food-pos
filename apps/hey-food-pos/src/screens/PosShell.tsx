import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { OutletProductOverride } from "@hey-food/shared-types";
import type { OrderWithItems } from "@hey-food/api-client";
import { BRAND_COLORS } from "@hey-food/design-tokens";

import { TopBar } from "../components/TopBar";
import type { PosScreen } from "../navigation";
import { createMockOrders } from "../mock/orders";
import { createMockOverrides, createMockProducts } from "../mock/products";
import { QueueScreen } from "./QueueScreen";
import { MenuAvailabilityScreen } from "./MenuAvailabilityScreen";
import { DailySummaryScreen } from "./DailySummaryScreen";

export interface PosShellProps {
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
 */
export function PosShell({ staffName, outletName }: PosShellProps) {
  const insets = useSafeAreaInsets();
  const [activeScreen, setActiveScreen] = useState<PosScreen>("queue");
  const [orders, setOrders] = useState<OrderWithItems[]>(createMockOrders);
  const [overrides, setOverrides] = useState<OutletProductOverride[]>(createMockOverrides);
  const [products] = useState(createMockProducts);

  return (
    <View style={[styles.shell, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <TopBar
        outletName={outletName}
        staffName={staffName}
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
      />

      <View style={styles.body}>
        {activeScreen === "queue" && <QueueScreen orders={orders} onChangeOrders={setOrders} />}
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
