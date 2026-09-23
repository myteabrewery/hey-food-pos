import { HttpStatus, Injectable } from "@nestjs/common";
import type { StaffLoginRequest, StaffLoginResponse, StaffLogoutResponse } from "@hey-food/api-client";
import { StaffLoginResponseSchema, StaffLogoutResponseSchema } from "@hey-food/api-client";
import type { StaffUser } from "@prisma/client";

import { ApiException } from "../common/api-exception";
import { PrismaService } from "../prisma/prisma.service";
import { verifyPin } from "./pin-hash";
import { generateSessionToken, hashSessionToken } from "./session-token";
import { toPublicStaffDto } from "./staff.mapper";
import type { StaffSessionContext } from "./staff-session.guard";

/**
 * 12 hours: comfortably covers a realistic single shift with buffer, while
 * keeping a lost/stolen tablet's exposure window tighter than a full day. An
 * easy constant to adjust later if real shift lengths demand it.
 */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Real POS staff PIN login (dev spec 5.5), replacing POS_DEVICE_KEY.
 *
 * PIN lookup: no index can look up a scrypt hash by the raw PIN (that's the
 * point of a salted hash), so this fetches every staff row IN THE GIVEN
 * BUSINESS and re-hashes the candidate PIN against each stored salt — O(n) in
 * staff count, same cost/tradeoff as the Staff pass's PIN-uniqueness check,
 * fine for a small business.
 *
 * Order of checks matters: PIN correctness first (a wrong PIN is always
 * "Incorrect PIN", regardless of any other property of the account it might
 * have matched), THEN deactivated, THEN role. An hq_admin's PIN still has to
 * be right before they're told to use the HQ app instead — never reveal
 * anything about an account before proving the PIN.
 */
@Injectable()
export class PosAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(request: StaffLoginRequest): Promise<StaffLoginResponse> {
    const business = await this.prisma.business.findUnique({ where: { id: request.businessId }, select: { id: true } });
    if (!business) {
      throw new ApiException(HttpStatus.NOT_FOUND, "BUSINESS_NOT_FOUND", `Business "${request.businessId}" not found.`);
    }

    const candidates = await this.prisma.staffUser.findMany({ where: { businessId: request.businessId } });
    const staff = candidates.find((row) => verifyPin(request.pin, row.pinHash));
    if (!staff) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "STAFF_LOGIN_INVALID", "Incorrect PIN.");
    }
    if (!staff.isActive) {
      throw new ApiException(HttpStatus.FORBIDDEN, "STAFF_DEACTIVATED", "This account has been deactivated. Contact your manager.");
    }
    if (staff.role === "hq_admin") {
      throw new ApiException(HttpStatus.FORBIDDEN, "STAFF_ROLE_NOT_ALLOWED_ON_POS", "HQ Admins should use the HQ Admin app, not the POS.");
    }

    const outletId = await this.resolveOutlet(staff, request.outletId);
    if (outletId === "choose") {
      const outlets = await this.prisma.outlet.findMany({
        where: { id: { in: staff.assignedOutletIds } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      return StaffLoginResponseSchema.parse({ status: "choose_outlet", outlets });
    }

    const token = generateSessionToken();
    await this.prisma.staffSession.create({
      data: {
        staffId: staff.id,
        outletId,
        deviceId: request.deviceId,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    const outlet = await this.prisma.outlet.findUniqueOrThrow({ where: { id: outletId }, select: { id: true, name: true } });
    return StaffLoginResponseSchema.parse({ status: "ok", token, staff: toPublicStaffDto(staff), outlet });
  }

  async logout(session: StaffSessionContext): Promise<StaffLogoutResponse> {
    await this.prisma.staffSession.update({
      where: { id: session.sessionId },
      data: { revokedAt: new Date() },
    });
    return StaffLogoutResponseSchema.parse({ success: true });
  }

  /**
   * `outlet_staff` always resolves outright (exactly one assigned outlet,
   * enforced by the Staff CHECK constraint — no ambiguity ever). `area_manager`
   * resolves outright too when they have exactly one, or when `requestedOutletId`
   * was already sent and is one of theirs; otherwise returns `"choose"` so the
   * caller shows a picker. `hq_admin` never reaches this — rejected earlier.
   */
  private async resolveOutlet(staff: StaffUser, requestedOutletId: string | undefined): Promise<string | "choose"> {
    if (staff.role === "outlet_staff" || staff.assignedOutletIds.length === 1) {
      const [onlyOutletId] = staff.assignedOutletIds;
      if (onlyOutletId === undefined) {
        // The CHECK constraint guarantees this never happens; fail loudly rather than silently picking no outlet.
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STAFF_OUTLET_ASSIGNMENT_INVALID", `Staff "${staff.id}" has no assigned outlet.`);
      }
      return onlyOutletId;
    }
    if (requestedOutletId === undefined) {
      return "choose";
    }
    if (!staff.assignedOutletIds.includes(requestedOutletId)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "OUTLET_NOT_ASSIGNED", "You aren't assigned to that outlet.");
    }
    return requestedOutletId;
  }
}
