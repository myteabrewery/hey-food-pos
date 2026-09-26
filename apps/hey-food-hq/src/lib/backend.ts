import { ApiErrorSchema } from "@hey-food/api-client";

import { API_BASE_URL } from "./config";

/** A failed backend call, carrying the API's own `{ error: { code, message } }`. */
export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

/**
 * The one place every call to the backend actually happens, from the SERVER
 * only (server components and server actions) — shared by `admin-api.ts`
 * (`/admin/*`, always bearer-authenticated from the HQ session cookie) and
 * `hq-auth-api.ts` (`/auth/hq/*`, which includes the one call — login —
 * that by definition has no session yet). `token`, when given, is attached
 * as `Authorization: Bearer`; the caller decides whether one is required.
 * Never cached: prices, availability and orders are live data.
 */
export async function backendRequest(method: "GET" | "POST" | "PATCH", path: string, body?: unknown, token?: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new AdminApiError(0, "NETWORK_ERROR", "Couldn't reach the backend. Is it running?");
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(json);
    throw new AdminApiError(
      response.status,
      parsed.success ? parsed.data.error.code : "HTTP_ERROR",
      parsed.success ? parsed.data.error.message : `The backend answered ${response.status}.`,
    );
  }
  return json;
}
