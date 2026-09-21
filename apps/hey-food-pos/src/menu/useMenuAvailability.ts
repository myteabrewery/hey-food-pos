import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchMenu, setProductAvailability, type MenuItem } from "../api/menu";
import { PosApiError } from "../api/http";
import { USE_MOCK_ORDERS } from "../config";
import { createMockMenuItems } from "../mock/products";
import { useOptimisticActions } from "../optimistic/useOptimisticActions";

/** "error" only means the FIRST load failed and there is nothing to show; a failed refresh keeps the last menu. */
export type MenuLoadState = "loading" | "ready" | "error";

export interface MenuAvailability {
  /** The outlet's products, with any in-flight toggle applied optimistically. */
  items: MenuItem[];
  state: MenuLoadState;
  /** Why the last (re)load failed; with `state` "ready" it means "showing the last-loaded menu". */
  loadError: string | null;
  /** Reload from the server (the shell calls this each time the Menu tab opens). */
  refresh: () => void;
  /** Set a product sold out / available: optimistic, saved to the server, rolled back with an error if that fails. */
  setAvailability: (item: MenuItem, isAvailable: boolean) => void;
  actionError: string | null;
  dismissActionError: () => void;
}

/**
 * Menu Availability's data and its toggle, built on the same optimistic-update
 * pattern as the queue's staff actions (useOptimisticActions).
 *
 * READING: the outlet's resolved menu, fetched when the shell loads and again
 * whenever the Menu tab opens — no polling. Nothing else writes availability
 * yet (HQ's availability matrix, dev spec 9.3, isn't built), and because a tap
 * sends the DESIRED state rather than a flip, a stale list can't cause a wrong
 * toggle. Revisit when a second writer exists.
 *
 * WRITING: tapping sets the product to the opposite of what is shown, right
 * away; the server's answer replaces the guess, and a failure (offline, 404,
 * rejected key, ...) puts the toggle back and raises the banner.
 *
 * In mock/demo mode (EXPO_PUBLIC_POS_USE_MOCK_ORDERS=1) there is no server and
 * toggles just stay local.
 */
export function useMenuAvailability(outletId: string): MenuAvailability {
  const [serverItems, setServerItems] = useState<MenuItem[]>(() => (USE_MOCK_ORDERS ? createMockMenuItems() : []));
  const [state, setState] = useState<MenuLoadState>(USE_MOCK_ORDERS ? "ready" : "loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  // Bumped by refresh(); each bump re-runs the load effect below.
  const [reloadKey, setReloadKey] = useState(0);
  const { overlay, actionError, dismissActionError, epoch, run } = useOptimisticActions<MenuItem>();

  useEffect(() => {
    if (USE_MOCK_ORDERS) return;

    let cancelled = false;
    // A load that STARTED before a toggle was saved may still show the old
    // availability; if `epoch` moved while it was in flight its result is dropped.
    const startedAt = epoch.current;

    const load = async () => {
      try {
        const fetched = await fetchMenu(outletId);
        if (cancelled) return;
        if (epoch.current === startedAt) setServerItems(fetched);
        setState("ready");
        setLoadError(null);
      } catch (caught) {
        if (cancelled) return;
        setLoadError(caught instanceof PosApiError ? caught.message : "Got an unexpected response from the server.");
        // Keep whatever is already on screen; only a first load with nothing to show is an error state.
        setState((previous) => (previous === "ready" ? "ready" : "error"));
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [outletId, epoch, reloadKey]);

  const refresh = useCallback(() => {
    if (USE_MOCK_ORDERS) return;
    // Retrying from the error screen shows "Loading…" again while it reloads.
    setState((previous) => (previous === "error" ? "loading" : previous));
    setReloadKey((key) => key + 1);
  }, []);

  const items = useMemo(() => serverItems.map((item) => overlay[item.id] ?? item), [serverItems, overlay]);

  const setAvailability = useCallback(
    (item: MenuItem, isAvailable: boolean) => {
      if (USE_MOCK_ORDERS) {
        setServerItems((prev) => prev.map((existing) => (existing.id === item.id ? { ...existing, isAvailable } : existing)));
        return;
      }
      run({
        key: item.id,
        optimistic: { ...item, isAvailable },
        save: () => setProductAvailability(outletId, item.id, isAvailable),
        // Adopt the server's answer. Only availability is taken from it: the
        // displayed price is the outlet's resolved price from the menu read.
        onSaved: (saved) =>
          setServerItems((prev) =>
            prev.map((existing) => (existing.id === saved.productId ? { ...existing, isAvailable: saved.isAvailable } : existing)),
          ),
        failureAction: `mark ${item.name} ${isAvailable ? "available" : "sold out"}`,
      });
    },
    [outletId, run],
  );

  return { items, state, loadError, refresh, setAvailability, actionError, dismissActionError };
}
