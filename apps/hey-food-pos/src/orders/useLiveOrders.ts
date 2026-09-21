import { useCallback, useEffect, useMemo, useState } from "react";

import type { OrderWithItems, PosOrderStatus } from "@hey-food/api-client";

import { patchOrderStatus, postCancelOrder } from "../api/orderActions";
import { PosApiError } from "../api/http";
import { fetchQueue } from "../api/queue";
import { QUEUE_POLL_MS, USE_MOCK_ORDERS } from "../config";
import { createMockOrders } from "../mock/orders";
import { useOptimisticActions } from "../optimistic/useOptimisticActions";
import { advanceOrder, cancelOrder, type StaffCancelRequest } from "./transitions";

export type ConnectionState = "loading" | "live" | "offline" | "mock";

export interface LiveOrders {
  /** What the queue shows: the server's orders, with any in-flight staff action applied optimistically. */
  orders: OrderWithItems[];
  /** Start / Ready / Collect: optimistic, then saved to the server; rolled back if that fails. */
  advance: (order: OrderWithItems, nextStatus: PosOrderStatus) => void;
  /** Staff cancel: optimistic, then saved to the server; rolled back if that fails. */
  cancel: (order: OrderWithItems, request: StaffCancelRequest) => void;
  connection: ConnectionState;
  /** Why the last poll failed, while `connection` is "offline". */
  errorMessage: string | null;
  /** The last staff action that could NOT be saved (and was undone), for the banner. */
  actionError: string | null;
  dismissActionError: () => void;
}

/**
 * The queue's data source and its staff actions.
 *
 * READING: real orders from the backend, polled every few seconds (or the
 * mock orders when EXPO_PUBLIC_POS_USE_MOCK_ORDERS=1).
 *
 * WRITING (Stage B): a staff action is applied OPTIMISTICALLY (the card moves
 * on tap), sent to the server, and then either replaced by the server's
 * authoritative copy or — if the request fails for ANY reason — ROLLED BACK to
 * what the server last said, with a visible error. That pattern (overlay,
 * one-action-per-key guard, stale-refetch guard, rollback, banner text) lives
 * in useOptimisticActions and is shared with Menu Availability. Mock mode has
 * no server, so its actions just stay local.
 *
 * NOT built (dev spec 5.1 wants it, and it's the biggest remaining gap): an
 * offline action queue. A tap made while offline is undone with an error
 * rather than held and replayed on reconnect.
 */
export function useLiveOrders(outletId: string): LiveOrders {
  const [serverOrders, setServerOrders] = useState<OrderWithItems[]>(() =>
    USE_MOCK_ORDERS ? createMockOrders() : [],
  );
  const [connection, setConnection] = useState<ConnectionState>(USE_MOCK_ORDERS ? "mock" : "loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { overlay, actionError, dismissActionError, epoch, run: runOptimistic } = useOptimisticActions<OrderWithItems>();

  useEffect(() => {
    if (USE_MOCK_ORDERS) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      // A poll that STARTED before a save landed may still show the pre-action
      // state; if `epoch` moved while it was in flight, its result is dropped.
      const startedAt = epoch.current;
      try {
        const fetched = await fetchQueue(outletId);
        if (cancelled) return;
        if (epoch.current === startedAt) setServerOrders(fetched);
        setConnection("live");
        setErrorMessage(null);
      } catch (caught) {
        if (cancelled) return;
        // Keep showing the last good orders; just say we're not live.
        setConnection("offline");
        setErrorMessage(caught instanceof PosApiError ? caught.message : "Got an unexpected response from the server.");
      }
      if (!cancelled) timer = setTimeout(poll, QUEUE_POLL_MS);
    };
    void poll();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [outletId, epoch]);

  const orders = useMemo(() => serverOrders.map((order) => overlay[order.id] ?? order), [serverOrders, overlay]);

  const run = useCallback(
    (order: OrderWithItems, optimisticVersion: OrderWithItems, save: () => Promise<OrderWithItems>, verb: string) => {
      if (USE_MOCK_ORDERS) {
        setServerOrders((prev) => prev.map((existing) => (existing.id === order.id ? optimisticVersion : existing)));
        return;
      }
      runOptimistic({
        key: order.id,
        optimistic: optimisticVersion,
        save,
        // Adopt the server's copy (its real timestamps and status).
        onSaved: (saved) => setServerOrders((prev) => prev.map((existing) => (existing.id === saved.id ? saved : existing))),
        failureAction: `${verb} #${order.displayId}`,
      });
    },
    [runOptimistic],
  );

  const advance = useCallback(
    (order: OrderWithItems, nextStatus: PosOrderStatus) => {
      const verb = nextStatus === "preparing" ? "start" : nextStatus === "ready" ? "mark ready" : "collect";
      run(order, advanceOrder(order, nextStatus, new Date().toISOString()), () => patchOrderStatus(order.id, nextStatus), verb);
    },
    [run],
  );

  const cancel = useCallback(
    (order: OrderWithItems, request: StaffCancelRequest) => {
      run(order, cancelOrder(order, request, new Date().toISOString()), () => postCancelOrder(order.id, request), "cancel");
    },
    [run],
  );

  return { orders, advance, cancel, connection, errorMessage, actionError, dismissActionError };
}
