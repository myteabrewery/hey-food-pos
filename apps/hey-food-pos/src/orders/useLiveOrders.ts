import { useCallback, useEffect, useMemo, useState, type SetStateAction } from "react";

import type { OrderWithItems } from "@hey-food/api-client";
import { OrderStatus } from "@hey-food/shared-types";

import { fetchQueue, QueueFetchError } from "../api/queue";
import { QUEUE_POLL_MS, USE_MOCK_ORDERS } from "../config";
import { createMockOrders } from "../mock/orders";

export type ConnectionState = "loading" | "live" | "offline" | "mock";

export interface LiveOrders {
  /** What the queue shows: server orders with this tablet's local changes applied on top. */
  orders: OrderWithItems[];
  /** Drop-in for the old `useState` setter: records local (staff-made) changes. */
  setOrders: (update: SetStateAction<OrderWithItems[]>) => void;
  connection: ConnectionState;
  /** Why the last fetch failed, while `connection` is "offline" (or a rejected key etc.). */
  errorMessage: string | null;
}

// How far along the lifecycle a status is; used to decide whether the server
// or this tablet's local copy of an order is "ahead".
const STATUS_RANK: Record<string, number> = {
  [OrderStatus.Pending]: 0,
  [OrderStatus.Paid]: 1,
  [OrderStatus.Received]: 1,
  [OrderStatus.Preparing]: 2,
  [OrderStatus.Ready]: 3,
  [OrderStatus.Collected]: 4,
  [OrderStatus.Completed]: 5,
  [OrderStatus.Cancelled]: 9,
};
const rank = (status: string): number => STATUS_RANK[status] ?? 0;

/**
 * STAGE A stand-in for the server's `paid -> received` step. Per dev spec
 * Section 3 the POS "receiving" a paid order is what moves it to `received`,
 * but that is a write the backend doesn't expose yet (Stage B). Until then
 * the queue simply treats a freshly `paid` order as `received` — i.e. the
 * "New" column — on screen only. Nothing is written back.
 */
function asReceived(order: OrderWithItems): OrderWithItems {
  return order.status === OrderStatus.Paid ? { ...order, status: OrderStatus.Received } : order;
}

/**
 * The queue's data source: real orders from the backend (polled), or the
 * mock orders when EXPO_PUBLIC_POS_USE_MOCK_ORDERS=1.
 *
 * STAGE A IS READ-ONLY. Staff actions (Start / Ready / Collect / Cancel) do
 * NOT reach the server — the write endpoints are Stage B. So a staff action
 * is kept as a LOCAL OVERRIDE for that order and layered over each fetch:
 * without that, the next poll (server still says "paid") would visibly undo
 * the action five seconds later. An override is dropped in favour of the
 * server's copy only if the server is strictly further along (e.g. HQ
 * cancelled it). Overrides live in memory: they are lost on app restart, at
 * which point the queue shows the server's truth again. The queue screen says
 * so on screen.
 */
export function useLiveOrders(outletId: string): LiveOrders {
  const [serverOrders, setServerOrders] = useState<OrderWithItems[]>(() =>
    USE_MOCK_ORDERS ? createMockOrders() : [],
  );
  const [overrides, setOverrides] = useState<Record<string, OrderWithItems>>({});
  const [connection, setConnection] = useState<ConnectionState>(USE_MOCK_ORDERS ? "mock" : "loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK_ORDERS) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const fetched = await fetchQueue(outletId);
        if (cancelled) return;
        setServerOrders(fetched.map(asReceived));
        setConnection("live");
        setErrorMessage(null);
      } catch (caught) {
        if (cancelled) return;
        // Keep showing the last good orders; just say we're not live.
        setConnection("offline");
        setErrorMessage(
          caught instanceof QueueFetchError ? caught.message : "Got an unexpected response from the server.",
        );
      }
      if (!cancelled) timer = setTimeout(poll, QUEUE_POLL_MS);
    };
    void poll();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [outletId]);

  const orders = useMemo(
    () =>
      serverOrders.map((server) => {
        const local = overrides[server.id];
        return local && rank(local.status) >= rank(server.status) ? local : server;
      }),
    [serverOrders, overrides],
  );

  // Callers pass functional updates against the list they can see (the merged
  // `orders`); record every order the update changed as a local override.
  const setOrders = useCallback(
    (update: SetStateAction<OrderWithItems[]>) => {
      const next = typeof update === "function" ? update(orders) : update;
      setOverrides((prev) => {
        const changed: Record<string, OrderWithItems> = { ...prev };
        for (const order of next) {
          const before = orders.find((existing) => existing.id === order.id);
          if (before !== order) changed[order.id] = order;
        }
        return changed;
      });
    },
    [orders],
  );

  return { orders, setOrders, connection, errorMessage };
}
