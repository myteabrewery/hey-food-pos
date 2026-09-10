import type { z } from "zod";

/**
 * The backend's dev server always listens on localhost:3000 (see
 * apps/hey-food-backend's README/package.json — PORT defaults to 3000).
 *
 * `localhost` works unmodified for the web preview and iOS Simulator (both
 * share the host machine's network namespace), but a physical device
 * reached over USB needs `adb reverse tcp:3000 tcp:3000` run once per
 * session — exactly like the existing `adb reverse tcp:8081 tcp:8081` this
 * project already relies on for Metro's bundle server. Without that
 * second reverse, `localhost:3000` on the phone resolves to the phone
 * itself, not this machine, and every request below fails to connect.
 *
 * Not yet handling: a real staging/prod backend URL. Revisit this constant
 * (env-based config, most likely) once one exists to point at.
 */
export const API_BASE_URL = "http://localhost:3000";

/**
 * Fetches `${API_BASE_URL}${path}` and validates the JSON body against
 * `schema` — every api/ function should go through this rather than
 * calling `fetch` directly, so response-shape validation against
 * api-client's schemas (the same schemas the backend validates its own
 * responses against) isn't something each call site has to remember.
 */
export async function fetchJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${response.status}`);
  }

  const body = await response.json();
  return schema.parse(body);
}
