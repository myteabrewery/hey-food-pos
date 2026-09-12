import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { StaffUser } from "@hey-food/shared-types";

import { LoginScreen } from "./screens/LoginScreen";
import { QueueScreen } from "./screens/QueueScreen";
import { MOCK_OUTLET_NAME, MOCK_STAFF } from "./mock/session";

/**
 * Hey Food Outlet POS (Android tablet, offline-first) — first real screen
 * per docs/hey-food-developer-spec-v1.md Section 5.1 (Order Queue), gated
 * behind a login stub (Section 5.5's real PIN+device-binding login isn't
 * built yet). `session` is null until LoginScreen's placeholder button is
 * pressed; there is no logout path yet since nothing downstream needs one
 * for this pass.
 */
export default function App() {
  const [session, setSession] = useState<{ staff: StaffUser; outletName: string } | null>(null);

  return (
    <SafeAreaProvider>
      {session ? (
        <QueueScreen staff={session.staff} outletName={session.outletName} />
      ) : (
        <LoginScreen onLogIn={() => setSession({ staff: MOCK_STAFF, outletName: MOCK_OUTLET_NAME })} />
      )}
    </SafeAreaProvider>
  );
}
