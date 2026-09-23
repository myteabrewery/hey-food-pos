import { ApiErrorSchema } from "@hey-food/api-client";

import { API_BASE_URL } from "../config";
import { clearSession, getCurrentSession } from "../session/session-store";

/** A failed POS API call. `status` 0 means nothing came back (offline / server down / timeout). */
export class PosApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "PosApiError";
  }
}

const REQUEST_TIMEOUT_MS = 8_000;

export interface PosRequestOptions {
  /**
   * Send the current staff session's bearer token (default true). Off for the
   * PUBLIC endpoints the POS also reads (the menu at GET /outlets/:id), which
   * need no token and shouldn't be handed one.
   */
  withAuth?: boolean;
}

/**
 * One request to the backend. Sends the current staff session's token (real
 * PIN login, see session/session-store.ts — replaces the old shared device
 * key) unless told not to, enforces a timeout, and turns every failure into a
 * PosApiError carrying the API's own `{ error: { code, message } }` when
 * there is one. Returns the parsed JSON body of a success; callers validate
 * it against their api-client schema.
 *
 * A 401 (missing/invalid/expired/revoked session, or the staff member was
 * deactivated) clears the stored session — see session-store's doc comment
 * for why that is where App.tsx finds out and bounces back to LoginScreen,
 * not here.
 */
export async function posRequest(
  method: "GET" | "PATCH" | "POST",
  path: string,
  body?: unknown,
  { withAuth = true }: PosRequestOptions = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const token = withAuth ? getCurrentSession()?.token : undefined;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new PosApiError("Can't reach the server.", 0, "NETWORK_ERROR");
  } finally {
    clearTimeout(timeout);
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && withAuth) {
      void clearSession();
    }
    const parsed = ApiErrorSchema.safeParse(json);
    throw new PosApiError(
      parsed.success ? parsed.data.error.message : `Server error (${response.status}).`,
      response.status,
      parsed.success ? parsed.data.error.code : "HTTP_ERROR",
    );
  }
  return json;
}
