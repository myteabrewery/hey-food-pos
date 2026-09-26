"use server";

import { HqLoginRequestSchema } from "@hey-food/api-client";

import { fromCaught as fromCaughtWith, fromZod, type ActionResult } from "@/lib/action-result";
import { HQ_BUSINESS_ID } from "@/lib/config";
import { hqLogin } from "@/lib/hq-auth-api";
import { setHqSessionCookie } from "@/lib/session";

const fromCaught = (caught: unknown): ActionResult<never> => fromCaughtWith(caught, "HQ login failed");

/**
 * Real HQ web login (`POST /auth/hq/login`), replacing the "one button, no
 * session" placeholder outright. `businessId` is this server's own
 * configuration, applied here exactly like `createStaffAction` applies it —
 * the login form itself only ever collects phone + password.
 */
export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = HqLoginRequestSchema.safeParse({ ...(typeof input === "object" && input !== null ? input : {}), businessId: HQ_BUSINESS_ID });
  if (!parsed.success) return fromZod(parsed.error);
  try {
    const { token } = await hqLogin(parsed.data);
    setHqSessionCookie(token);
    return { ok: true, data: null };
  } catch (caught) {
    return fromCaught(caught);
  }
}
