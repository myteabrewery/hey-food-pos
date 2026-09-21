import { PosApiError } from "../api/http";

/**
 * What the tablet tells staff when an action was undone: never a silent drop.
 * `action` completes "Couldn't ...", e.g. "start #PM003" or "mark Iced Tea
 * sold out". Shared by every optimistic staff action (orders, menu).
 */
export function describeFailure(error: unknown, action: string): string {
  if (error instanceof PosApiError) {
    if (error.status === 0) {
      return `Couldn't ${action}: can't reach the server. It has been put back as it was.`;
    }
    if (error.status === 401 || error.status === 503) {
      return `Couldn't ${action}: the server didn't accept this tablet. It has been put back as it was.`;
    }
    return `Couldn't ${action}: ${error.message} It has been put back as it was.`;
  }
  return `Couldn't ${action}: unexpected response from the server. It has been put back as it was.`;
}
