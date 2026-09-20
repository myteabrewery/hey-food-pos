import { timingSafeEqual } from "node:crypto";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";

import { ApiException } from "../common/api-exception";
import { getPosDeviceKey } from "../common/env";

/**
 * ############################################################################
 * TEMPORARY STAND-IN FOR REAL POS AUTH — MUST BE REPLACED BEFORE PRODUCTION.
 * ############################################################################
 * Dev spec Section 5.5 calls for PIN-based staff login on a device that is
 * bound to its outlet. None of that exists. Until it does, POS endpoints are
 * guarded by one shared secret (env POS_DEVICE_KEY) sent as `X-Pos-Device-Key`.
 *
 * What this does NOT give you — the reasons it cannot ship:
 *  - Not per-device or per-staff: anyone holding the key is "the POS", for
 *    EVERY outlet, and it cannot be revoked for one device.
 *  - The POS app is an Expo bundle, so the key sits inside the app binary
 *    and can be extracted by anyone who has the app.
 *  - No outlet binding: the key doesn't say which outlet the caller is.
 *
 * Safeguards: fails CLOSED (503) when no key is configured; a production
 * process refuses to start with POS_DEVICE_KEY set (common/env.ts); CORS does
 * not allow the header, so a browser on another origin can't send it; startup
 * logs a [TEMP POS AUTH] warning. Listed in the README's Pre-launch checklist.
 */
@Injectable()
export class PosDeviceKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const configured = getPosDeviceKey();
    if (configured === null) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "POS_AUTH_NOT_CONFIGURED",
        "POS access is not configured on this server.",
      );
    }

    const presented = context.switchToHttp().getRequest<Request>().header("x-pos-device-key") ?? "";
    const a = Buffer.from(presented);
    const b = Buffer.from(configured);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "POS_UNAUTHORIZED", "Missing or invalid POS device key.");
    }
    return true;
  }
}
