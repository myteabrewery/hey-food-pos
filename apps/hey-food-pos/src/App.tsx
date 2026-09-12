import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { StaffUser } from "@hey-food/shared-types";

import { LoginScreen } from "./screens/LoginScreen";
import { PosShell } from "./screens/PosShell";
import { MOCK_OUTLET_NAME, MOCK_STAFF } from "./mock/session";

/**
 * Hey Food Outlet POS (Android tablet, offline-first), gated behind a
 * login stub (dev spec Section 5.5's real PIN+device-binding login isn't
 * built yet). `session` is null until LoginScreen's placeholder button is
 * pressed; there is no logout path yet since nothing downstream needs one
 * for this pass. Everything past login (Queue, Menu Availability, Daily
 * Summary, and the navigation between them) lives in PosShell.
 */
export default function App() {
  const [session, setSession] = useState<{ staff: StaffUser; outletName: string } | null>(null);

  return (
    <SafeAreaProvider>
      {session ? (
        <PosShell staffName={session.staff.name} outletName={session.outletName} />
      ) : (
        <LoginScreen onLogIn={() => setSession({ staff: MOCK_STAFF, outletName: MOCK_OUTLET_NAME })} />
      )}
    </SafeAreaProvider>
  );
}
