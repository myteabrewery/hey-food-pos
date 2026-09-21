import { useCallback, useEffect, useRef, useState } from "react";

import { describeFailure } from "./describeFailure";

export interface OptimisticRun<T, S> {
  /** Identity of the thing being changed (an order id, a product id). One action per key at a time. */
  key: string;
  /** What to show immediately, before the server has answered. */
  optimistic: T;
  /** The request. Its result is handed to `onSaved`. */
  save: () => Promise<S>;
  /** Adopt the server's authoritative answer into the caller's own state. */
  onSaved: (saved: S) => void;
  /** Completes "Couldn't ...": "start #PM003", "mark Iced Tea sold out". */
  failureAction: string;
}

export interface OptimisticActions<T> {
  /** In-flight optimistic copies by key; layer these over the server's data. */
  overlay: Record<string, T>;
  /** The last action that could NOT be saved (and was undone), for a banner. */
  actionError: string | null;
  dismissActionError: () => void;
  /**
   * Bumped whenever a save lands. A refetch that STARTED before that may still
   * show the pre-action state, so the caller reads this before fetching and
   * discards a result whose value has changed.
   */
  epoch: { current: number };
  run: <S>(action: OptimisticRun<T, S>) => void;
}

const ACTION_ERROR_MS = 10_000;

/**
 * The optimistic-update / save / rollback pattern shared by every POS staff
 * action (Stage B's Start / Ready / Collect / Cancel, Menu Availability):
 *
 *  - the change shows IMMEDIATELY (an overlay over the server's copy);
 *  - the request is sent, and on success the server's copy is adopted;
 *  - if it fails for ANY reason (offline, timeout, a 409 because another
 *    device or HQ got there first, a rejected key) the overlay is dropped, so
 *    the item reverts to what the server last said, and a visible error is
 *    set. Nothing is dropped silently;
 *  - one action per key at a time (a second tap while the first is saving is
 *    ignored — the item has already moved on optimistically);
 *  - the error clears itself after 10 s, or on dismiss.
 *
 * KNOWN GAP (docs/STATUS.md): if the server applies an action but the
 * response is lost, this treats it as a failure and rolls back, until the next
 * refetch corrects it.
 *
 * Not built: an offline queue. A save made while offline is undone with an
 * error, not held and replayed.
 */
export function useOptimisticActions<T>(): OptimisticActions<T> {
  const [overlay, setOverlay] = useState<Record<string, T>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const inFlight = useRef(new Set<string>());
  const epoch = useRef(0);

  useEffect(() => {
    if (actionError === null) return;
    const timer = setTimeout(() => setActionError(null), ACTION_ERROR_MS);
    return () => clearTimeout(timer);
  }, [actionError]);

  const run = useCallback(<S,>({ key, optimistic, save, onSaved, failureAction }: OptimisticRun<T, S>) => {
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setActionError(null);
    setOverlay((prev) => ({ ...prev, [key]: optimistic }));

    save()
      .then((saved) => {
        epoch.current += 1;
        onSaved(saved);
      })
      .catch((caught: unknown) => {
        // Rollback = drop the overlay (in `finally`); tell the staff why.
        setActionError(describeFailure(caught, failureAction));
      })
      .finally(() => {
        inFlight.current.delete(key);
        setOverlay((prev) => {
          const rest = { ...prev };
          delete rest[key];
          return rest;
        });
      });
  }, []);

  const dismissActionError = useCallback(() => setActionError(null), []);

  return { overlay, actionError, dismissActionError, epoch, run };
}
