import { HqLoginResponseSchema, HqLogoutResponseSchema, HqSessionResponseSchema, type HqLoginRequest, type HqLoginResponse, type HqLogoutResponse, type HqSessionResponse } from "@hey-food/api-client";

import { backendRequest } from "./backend";

/**
 * Calls to `/auth/hq/*` — kept separate from `admin-api.ts` (`/admin/*`)
 * because these three have a different relationship to the session: `login`
 * is the one backend call in this app that by definition has no token yet
 * (it's how one is obtained), and `logout`/`session` take their token
 * explicitly from the caller rather than reading the cookie themselves, so
 * `lib/session.ts` (the only place that touches `next/headers`) stays the
 * single place cookie reads/writes happen.
 */

export async function hqLogin(input: HqLoginRequest): Promise<HqLoginResponse> {
  return HqLoginResponseSchema.parse(await backendRequest("POST", "/auth/hq/login", input));
}

export async function hqLogout(token: string): Promise<HqLogoutResponse> {
  return HqLogoutResponseSchema.parse(await backendRequest("POST", "/auth/hq/logout", undefined, token));
}

export async function hqSession(token: string): Promise<HqSessionResponse> {
  return HqSessionResponseSchema.parse(await backendRequest("GET", "/auth/hq/session", undefined, token));
}
