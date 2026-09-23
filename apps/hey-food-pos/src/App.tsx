import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { logoutStaff } from "./api/auth";
import { USE_MOCK_ORDERS } from "./config";
import { MOCK_OUTLET_NAME, MOCK_STAFF } from "./mock/session";
import { LoginScreen } from "./screens/LoginScreen";
import { PosShell } from "./screens/PosShell";
import { clearSession, loadStoredSession, saveSession, subscribeToSession, type PosSession } from "./session/session-store";

const MOCK_SESSION: PosSession = {
  token: "mock",
  staffId: MOCK_STAFF.id,
  staffName: MOCK_STAFF.name,
  role: MOCK_STAFF.role,
  outletId: MOCK_STAFF.assignedOutletIds[0] ?? "",
  outletName: MOCK_OUTLET_NAME,
};

/**
 * Hey Food Outlet POS (Android tablet, offline-first). Gated behind real
 * staff PIN login (dev spec Section 5.5) — replaces the earlier one-button
 * demo stub now that StaffUser + a real backend session exist.
 *
 * `session` is restored from SecureStore on launch (`loadStoredSession`), so
 * a restart within the server's 12-hour session TTL skips the login screen;
 * `subscribeToSession` reacts to a session cleared from DEEP inside a fetch
 * call (a 401 — expired, revoked, or the staff member was deactivated — see
 * api/http.ts), bouncing back to LoginScreen even though nothing on THIS
 * screen triggered it.
 *
 * Mock mode (EXPO_PUBLIC_POS_USE_MOCK_ORDERS=1) skips real login entirely —
 * MOCK_STAFF stands in, exactly as before, for demos and offline UI work.
 */
export default function App() {
  const [session, setSession] = useState<PosSession | null>(USE_MOCK_ORDERS ? MOCK_SESSION : null);
  const [checkedStorage, setCheckedStorage] = useState(USE_MOCK_ORDERS);

  useEffect(() => {
    if (USE_MOCK_ORDERS) return;
    let cancelled = false;
    void loadStoredSession().then((restored) => {
      if (cancelled) return;
      setSession(restored);
      setCheckedStorage(true);
    });
    const unsubscribe = subscribeToSession((next) => {
      if (!cancelled) setSession(next);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  function handleLogOut() {
    if (!USE_MOCK_ORDERS) void logoutStaff().catch(() => {}); // best-effort server-side revoke; local logout proceeds regardless
    void clearSession();
    setSession(null);
  }

  if (!checkedStorage) {
    return <SafeAreaProvider />; // brief: checking SecureStore for a restorable session
  }

  return (
    <SafeAreaProvider>
      {session ? (
        <PosShell outletId={session.outletId} staffName={session.staffName} outletName={session.outletName} onLogOut={handleLogOut} />
      ) : (
        <LoginScreen onLoggedIn={(next) => void saveSession(next)} />
      )}
    </SafeAreaProvider>
  );
}
