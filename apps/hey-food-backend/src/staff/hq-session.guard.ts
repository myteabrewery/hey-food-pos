import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";

import { ApiException } from "../common/api-exception";
import { PrismaService } from "../prisma/prisma.service";
import { resolveStaffSession } from "./staff-session.guard";

/**
 * Real HQ web auth, replacing the `HQ_ADMIN_KEY` shared-secret stand-in
 * outright. Every session this guard accepts was issued by
 * `POST /auth/hq/login`, which already rejects `outlet_staff` outright (the
 * permissions matrix gives them no HQ-scoped action at all) — so this guard
 * accepts `hq_admin` OR `area_manager`, the two roles that can legitimately
 * hold an HQ session, even though `area_manager` cannot yet DO anything with
 * one (see `HqAdminSessionGuard`). Used only by the session-agnostic routes:
 * `GET /auth/hq/session` (so an area_manager's own name/role can render) and
 * `POST /auth/hq/logout` (logging out must always work, regardless of role).
 */
@Injectable()
export class HqSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = await resolveStaffSession(this.prisma, request);
    if (session.role === "outlet_staff") {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "POS_UNAUTHORIZED", "Missing or invalid session token.");
    }
    request.staffSession = session;
    return true;
  }
}

/**
 * The guard on every real `/admin/*` route (Orders, Menu Management, Staff,
 * Customers), replacing `HqAdminKeyGuard`. Stricter than `HqSessionGuard`:
 * `hq_admin` only.
 *
 * **`area_manager` is authenticated but blocked from every one of these
 * screens, deliberately, for now.** The dev spec's own permissions matrix
 * (Section 11) grants `area_manager` real, scoped access to some of this —
 * "view all-outlet reports" and "issue refund" both say "✓ (assigned outlets
 * only)" — but every one of these services still assumes the caller sees
 * the WHOLE business, exactly like `hq_admin`. Retrofitting each screen to
 * properly scope to `assignedOutletIds` is a separate, sizable pass (real
 * query changes in `AdminOrdersService` etc., not just a login gate) —
 * Orders is the natural first candidate, being the matrix's clearest grant.
 * Until that happens, rejecting `area_manager` here loudly (403, not a
 * silent empty result) is the honest state, not a broken partial scope.
 */
@Injectable()
export class HqAdminSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = await resolveStaffSession(this.prisma, request);
    if (session.role === "outlet_staff") {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "POS_UNAUTHORIZED", "Missing or invalid session token.");
    }
    if (session.role === "area_manager") {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "AREA_MANAGER_NOT_YET_SUPPORTED",
        "Area Manager access to this screen isn't available yet — HQ Admin only, for now.",
      );
    }
    request.staffSession = session;
    return true;
  }
}
