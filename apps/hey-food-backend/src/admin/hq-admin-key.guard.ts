import { timingSafeEqual } from "node:crypto";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";

import { ApiException } from "../common/api-exception";
import { getHqAdminKey } from "../common/env";

/**
 * ############################################################################
 * TEMPORARY STAND-IN FOR REAL HQ AUTHENTICATION — MUST BE REPLACED BEFORE
 * ANYTHING HQ IS EXPOSED. THIS IS THE MOST DANGEROUS STAND-IN IN THE REPO.
 * ############################################################################
 * The /admin/* endpoints can change ANY master price, ANY per-outlet price
 * override and ANY availability for the whole business, READ every outlet's
 * orders (customer phones masked) and CANCEL ANY order. The only thing in front
 * of them is one shared secret (env HQ_ADMIN_KEY) sent as `X-Hq-Admin-Key`.
 *
 * What it is NOT: authentication. The HQ web app has no login, so whoever can
 * reach the HQ app can make it send this key. It is held only in the HQ app's
 * SERVER environment (never in a browser bundle, unlike the POS key), and the
 * HQ app's package scripts refuse to bind to anything but localhost — but
 * that is a seatbelt, not security. It is not per-person, not per-role and not
 * revocable per user, and nothing records who used it.
 *
 * Safeguards: fails CLOSED (503) when no key is configured; a production
 * process refuses to start with HQ_ADMIN_KEY set (common/env.ts); CORS does not
 * allow the header, so a browser on another origin cannot send it; startup logs
 * a [TEMP HQ AUTH] warning. Listed as CRITICAL in README.md and docs/STATUS.md.
 */
@Injectable()
export class HqAdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const configured = getHqAdminKey();
    if (configured === null) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "HQ_AUTH_NOT_CONFIGURED",
        "HQ admin access is not configured on this server.",
      );
    }

    const presented = context.switchToHttp().getRequest<Request>().header("x-hq-admin-key") ?? "";
    const a = Buffer.from(presented);
    const b = Buffer.from(configured);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "HQ_UNAUTHORIZED", "Missing or invalid HQ admin key.");
    }
    return true;
  }
}
