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

/** What every POS route can read about who is calling — attached to the request by StaffSessionGuard. */
export interface StaffSessionContext {
  sessionId: string;
  staffId: string;
  /** The outlet THIS SESSION operates on, resolved once at login — see StaffLoginRequestSchema's doc comment. */
  outletId: string;
  role: StaffRole;
}

declare module "express" {
  interface Request {
    staffSession?: StaffSessionContext;
  }
}

/**
 * Real POS staff auth, replacing PosDeviceKeyGuard (removed). Reads
 * `Authorization: Bearer <token>`, hashes it, and looks up a live
 * StaffSession: not expired, not revoked, AND (re-checked on every request,
 * not just at login) the staff member is still active — a deactivation now
 * takes effect immediately on any session already in progress, not just on
 * the next login attempt.
 *
 * Deliberately vague on failure (401 either way): whether the token is
 * malformed, unknown, expired, revoked, or belongs to a now-inactive staff
 * member is not distinguished to the caller.
 */
@Injectable()
export class StaffSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = parseBearerToken(request.header("authorization"));
    if (!token) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "POS_UNAUTHORIZED", "Missing or invalid session token.");
    }

    const session = await this.prisma.staffSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { staff: { select: { isActive: true, role: true } } },
    });
    if (!session || session.revokedAt !== null || session.expiresAt.getTime() <= Date.now() || !session.staff.isActive) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "POS_UNAUTHORIZED", "Missing or invalid session token.");
    }

    request.staffSession = {
      sessionId: session.id,
      staffId: session.staffId,
      outletId: session.outletId,
      role: session.staff.role,
    };
    return true;
  }
}
