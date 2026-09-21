import { ApiErrorSchema } from "@hey-food/api-client";

import { API_BASE_URL, POS_DEVICE_KEY } from "../config";

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
   * Send the TEMPORARY shared device key (default true). Off for the PUBLIC
   * endpoints the POS also reads (the menu at GET /outlets/:id), which need no
   * key and shouldn't be handed one.
   */
  withDeviceKey?: boolean;
}

/**
 * One request to the backend. Sends the TEMPORARY shared device key (see
 * config.ts) unless told not to, enforces a timeout, and turns every failure
 * into a PosApiError carrying the API's own `{ error: { code, message } }`
 * when there is one. Returns the parsed JSON body of a success; callers
 * validate it against their api-client schema.
 */
export async function posRequest(
  method: "GET" | "PATCH" | "POST",
  path: string,
  body?: unknown,
  { withDeviceKey = true }: PosRequestOptions = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(withDeviceKey ? { "X-Pos-Device-Key": POS_DEVICE_KEY } : {}),
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
    const parsed = ApiErrorSchema.safeParse(json);
    throw new PosApiError(
      parsed.success ? parsed.data.error.message : `Server error (${response.status}).`,
      response.status,
      parsed.success ? parsed.data.error.code : "HTTP_ERROR",
    );
  }
  return json;
}
