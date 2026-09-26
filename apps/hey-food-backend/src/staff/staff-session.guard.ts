import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { HttpStatus, Injectable } from "@nestjs/common";
import type { StaffRole } from "@prisma/client";
import type { Request } from "express";

import { ApiException } from "../common/api-exception";
import { PrismaService } from "../prisma/prisma.service";
import { hashSessionToken } from "./session-token";

/** Same shape as orders/guest-token.ts's `parseBearerToken`. */
function parseBearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "");
  return match?.[1] ?? null;
}

/**
 * What every session-guarded route can read about who is calling — attached
 * to the request by StaffSessionGuard (POS) or HqSessionGuard/
 * HqAdminSessionGuard (HQ web). One shape for both: the underlying "is this
 * token valid" check is purpose-agnostic (see `resolveStaffSession`).
 */
export interface StaffSessionContext {
  sessionId: string;
  staffId: string;
  businessId: string;
  /**
   * The outlet THIS SESSION operates on, resolved once at POS login — see
   * StaffLoginRequestSchema's doc comment. NULL for an HQ session: an HQ
   * session is never bound to exactly one outlet (`hq_admin` sees all; an
   * `area_manager` may have several), so "which outlets" is read fresh from
   * StaffUser's role/assignedOutletIds wherever it matters, never cached
   * here. A POS route's `outletId !== session.outletId` check already
   * rejects a null-outletId (HQ) session correctly, with no special-casing.
   */
  outletId: string | null;
  role: StaffRole;
}

declare module "express" {
  interface Request {
    staffSession?: StaffSessionContext;
  }
}

/**
 * The one shared "is this bearer token a live session" check, used by every
 * session guard (POS's StaffSessionGuard, HQ's HqSessionGuard/
 * HqAdminSessionGuard) — re-checked on every request, not just at login, so
 * revocation and deactivation take effect immediately on a session already
 * in progress. Deliberately vague on failure (401 either way): whether the
 * token is malformed, unknown, expired, revoked, or belongs to a now-inactive
 * staff member is not distinguished to the caller.
 */
export async function resolveStaffSession(prisma: PrismaService, request: Request): Promise<StaffSessionContext> {
  const token = parseBearerToken(request.header("authorization"));
  if (!token) {
    throw new ApiException(HttpStatus.UNAUTHORIZED, "POS_UNAUTHORIZED", "Missing or invalid session token.");
  }

  const session = await prisma.staffSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { staff: { select: { isActive: true, role: true, businessId: true } } },
  });
  if (!session || session.revokedAt !== null || session.expiresAt.getTime() <= Date.now() || !session.staff.isActive) {
    throw new ApiException(HttpStatus.UNAUTHORIZED, "POS_UNAUTHORIZED", "Missing or invalid session token.");
  }

  return {
    sessionId: session.id,
    staffId: session.staffId,
    businessId: session.staff.businessId,
    outletId: session.outletId,
    role: session.staff.role,
  };
}

/**
 * Real POS staff auth, replacing PosDeviceKeyGuard (removed). Every session
 * this guard accepts was issued by `POST /auth/staff/login`, which already
 * only issues one to `outlet_staff`/`area_manager` (never `hq_admin`) — so
 * this guard itself does not filter by role, only by "is the token a live
 * session at all".
 */
@Injectable()
export class StaffSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    request.staffSession = await resolveStaffSession(this.prisma, request);
    return true;
  }
}
