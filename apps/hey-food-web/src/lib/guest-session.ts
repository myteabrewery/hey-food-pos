import { useSyncExternalStore } from "react";

/**
 * A guest's per-order secret (`guestToken`) and one flag about how it was
 * paid, kept in sessionStorage: the token is the ONLY proof of ownership of
 * the order (there is no login), so it lives as long as the tab and never
 * leaves it — never in a URL, never in localStorage. Same storage approach as
 * the cart, including an in-memory fallback for when storage is blocked.
 *
 * Losing it (new device, cleared tab) means losing access to the order's
 * page; the order itself is unaffected. That is inherent to phone-only guest
 * checkout without SMS — the "ready" SMS is what reaches the guest regardless.
 */
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

const tokenKey = (orderId: string) => `hey-food-web:guest-token:${orderId}`;
const stubKey = (orderId: string) => `hey-food-web:stub-paid:${orderId}`;

function read(key: string): string | null {
  try {
    const stored = window.sessionStorage.getItem(key);
    if (stored !== null) return stored;
  } catch {
    // fall through to memory
  }
  return memory.get(key) ?? null;
}

function write(key: string, value: string): void {
  memory.set(key, value);
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage blocked: the memory copy is the source of truth.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const saveGuestToken = (orderId: string, token: string): void => write(tokenKey(orderId), token);

/** Remember that the backend's payment STUB (not a real payment) paid this order. */
export const markStubPaid = (orderId: string): void => write(stubKey(orderId), "1");

/** Token for `orderId`, or null (server render, or not this browser's order). */
export function useGuestToken(orderId: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(tokenKey(orderId)),
    () => null,
  );
}

export function useStubPaid(orderId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => read(stubKey(orderId)) === "1",
    () => false,
  );
}
