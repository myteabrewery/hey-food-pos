import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { OrderWithItems, PosOrderStatus } from "@hey-food/api-client";

import { patchOrderStatus, postCancelOrder } from "../api/orderActions";
import { PosApiError } from "../api/http";
import { fetchQueue } from "../api/queue";
import { QUEUE_POLL_MS, USE_MOCK_ORDERS } from "../config";
import { createMockOrders } from "../mock/orders";
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

const ACTION_ERROR_MS = 10_000;

/** What the tablet tells staff when an action was undone — never a silent drop. */
function describeFailure(error: unknown, displayId: string, verb: string): string {
  if (error instanceof PosApiError) {
    if (error.status === 0) return `Couldn't ${verb} #${displayId}: can't reach the server. It has been put back as it was.`;
    if (error.status === 401 || error.status === 503) {
      return `Couldn't ${verb} #${displayId}: the server didn't accept this tablet. It has been put back as it was.`;
    }
    return `Couldn't ${verb} #${displayId}: ${error.message} It has been put back as it was.`;
  }
  return `Couldn't ${verb} #${displayId}: unexpected response from the server. It has been put back as it was.`;
}

/**
 * The queue's data source and its staff actions.
 *
 * READING: real orders from the backend, polled every few seconds (or the
 * mock orders when EXPO_PUBLIC_POS_USE_MOCK_ORDERS=1).
 *
 * WRITING (Stage B): a staff action is applied OPTIMISTICALLY (the card moves
 * on tap), sent to the server, and then either replaced by the server's
 * authoritative copy or — if the request fails for ANY reason (offline, timeout,
 * a 409 because another device or HQ changed the order first, a rejected key) —
 * ROLLED BACK to what the server last said, with a visible error. Nothing is
 * dropped silently. Mock mode has no server, so its actions just stay local.
 *
 * NOT built (dev spec 5.1 wants it, and it's the biggest remaining gap): an
 * offline action queue. A tap made while offline is undone with an error
 * rather than held and replayed on reconnect.
 */
export function useLiveOrders(outletId: string): LiveOrders {
  const [serverOrders, setServerOrders] = useState<OrderWithItems[]>(() =>
    USE_MOCK_ORDERS ? createMockOrders() : [],
  );
  // The optimistic copy of each order that has an action in flight.
  const [optimistic, setOptimistic] = useState<Record<string, OrderWithItems>>({});
  const [connection, setConnection] = useState<ConnectionState>(USE_MOCK_ORDERS ? "mock" : "loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // One action per order at a time: a second tap while the first is still
  // being saved is ignored (the button has already moved on optimistically).
  const inFlight = useRef(new Set<string>());
  // Bumped whenever a saved action lands. A poll that STARTED before that is
  // stale (it may still show the pre-action state) and is discarded, so a slow
  // poll can't flick a just-saved order back for a few seconds.
  const epoch = useRef(0);

  useEffect(() => {
    if (USE_MOCK_ORDERS) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
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
  }, [outletId]);

  // Auto-clear the action-error banner (staff can also dismiss it).
  useEffect(() => {
    if (actionError === null) return;
    const timer = setTimeout(() => setActionError(null), ACTION_ERROR_MS);
    return () => clearTimeout(timer);
  }, [actionError]);

  const orders = useMemo(
    () => serverOrders.map((order) => optimistic[order.id] ?? order),
    [serverOrders, optimistic],
  );

  const run = useCallback(
    (order: OrderWithItems, optimisticVersion: OrderWithItems, save: () => Promise<OrderWithItems>, verb: string) => {
      if (USE_MOCK_ORDERS) {
        setServerOrders((prev) => prev.map((existing) => (existing.id === order.id ? optimisticVersion : existing)));
        return;
      }
      if (inFlight.current.has(order.id)) return;
      inFlight.current.add(order.id);
      setActionError(null);
      setOptimistic((prev) => ({ ...prev, [order.id]: optimisticVersion }));

      save()
        .then((saved) => {
          epoch.current += 1;
          // Adopt the server's copy (its real timestamps and status).
          setServerOrders((prev) => prev.map((existing) => (existing.id === saved.id ? saved : existing)));
        })
        .catch((caught: unknown) => {
          // Rollback = drop the optimistic copy (in `finally`); the order
          // reverts to the server's last-known state. Tell the staff why.
          setActionError(describeFailure(caught, order.displayId, verb));
        })
        .finally(() => {
          inFlight.current.delete(order.id);
          setOptimistic((prev) => {
            const rest = { ...prev };
            delete rest[order.id];
            return rest;
          });
        });
    },
    [],
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

  const dismissActionError = useCallback(() => setActionError(null), []);

  return { orders, advance, cancel, connection, errorMessage, actionError, dismissActionError };
}
