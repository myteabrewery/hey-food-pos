"use server";

import { redirect } from "next/navigation";

import { hqLogout } from "@/lib/hq-auth-api";
import { clearHqSessionCookie, getHqToken } from "@/lib/session";

/**
 * Logs out of HQ. Revokes the session on the backend (best-effort — an
 * already-expired token or an unreachable backend never blocks this: the
 * cookie is cleared regardless, since from the user's point of view "log
 * out" must always succeed), then sends the browser to /login.
 */
export async function logoutAction(): Promise<void> {
  const token = getHqToken();
  if (token) {
    try {
      await hqLogout(token);
    } catch {
      // Already revoked/expired, or the backend is unreachable — clear the cookie regardless.
    }
  }
  clearHqSessionCookie();
  redirect("/login");
}
