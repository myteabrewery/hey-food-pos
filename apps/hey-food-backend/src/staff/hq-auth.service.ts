import { HttpStatus, Injectable } from "@nestjs/common";
import type { HqLoginRequest, HqLoginResponse, HqLogoutResponse, HqSessionResponse } from "@hey-food/api-client";
import { HqLoginResponseSchema, HqLogoutResponseSchema, HqSessionResponseSchema } from "@hey-food/api-client";

import { ApiException } from "../common/api-exception";
import { PrismaService } from "../prisma/prisma.service";
import { verifyPassword } from "./password-hash";
import { generateSessionToken, hashSessionToken } from "./session-token";
import type { StaffSessionContext } from "./staff-session.guard";
import { toPublicStaffDto } from "./staff.mapper";

/** Same 12-hour TTL as POS login (src/staff/pos-auth.service.ts) — no stronger reason to differ than "the two teams should be free to diverge later if real usage says so". */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * A real password hashed the same way (`hashPassword`, precomputed offline)
 * — never a login target itself, verified against whenever no real account
 * is available to check, so a lookup miss costs roughly the same scrypt work
 * as a real check. Keeps "wrong phone" and "wrong password" from being
 * distinguishable by response time alone.
 */
const DUMMY_PASSWORD_HASH =
  "cab42296a068e5b178f9e496429da758:1246491562fcaa176ffc6a9b980ee1725a6b77e9dca5bbf0f05238bbef18943cceb6ef2daeb83d9d941a0cff10edcf270e4d47e48ff126af7484dc1b9833fc0f";

/**
 * Real HQ web login (dev spec §2/9.4 area, blueprint §6 screen 1), replacing
 * the `HQ_ADMIN_KEY` shared-secret stand-in outright. See `HqLoginRequestSchema`'s
 * doc comment (api-client) for the full contrast with POS's PIN login:
 * phone+password looked up directly (not PIN-scanned), no outlet resolution
 * (an HQ session is never bound to one outlet — `StaffSession.outletId` is
 * NULL here), `outlet_staff` rejected outright.
 *
 * Order of checks matters, same discipline as POS login: credential
 * correctness first (a wrong phone/password is always the same generic
 * message, regardless of any other property of the account it might have
 * matched — including one with no password set at all), THEN deactivated,
 * THEN role.
 */
@Injectable()
export class HqAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(request: HqLoginRequest): Promise<HqLoginResponse> {
    const business = await this.prisma.business.findUnique({ where: { id: request.businessId }, select: { id: true } });
    if (!business) {
      throw new ApiException(HttpStatus.NOT_FOUND, "BUSINESS_NOT_FOUND", `Business "${request.businessId}" not found.`);
    }

    const staff = await this.prisma.staffUser.findFirst({ where: { businessId: request.businessId, phone: request.phone } });
    const passwordOk = verifyPassword(request.password, staff?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!staff || !passwordOk) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "HQ_LOGIN_INVALID", "Incorrect phone or password.");
    }
    if (!staff.isActive) {
      throw new ApiException(HttpStatus.FORBIDDEN, "STAFF_DEACTIVATED", "This account has been deactivated. Contact your administrator.");
    }
    if (staff.role === "outlet_staff") {
      throw new ApiException(HttpStatus.FORBIDDEN, "STAFF_ROLE_NOT_ALLOWED_ON_HQ", "Outlet Staff should use the POS, not HQ Admin.");
    }

    const token = generateSessionToken();
    await this.prisma.staffSession.create({
      data: {
        staffId: staff.id,
        outletId: null,
        deviceId: "hq-web",
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    return HqLoginResponseSchema.parse({ token, staff: toPublicStaffDto(staff) });
  }

  async logout(session: StaffSessionContext): Promise<HqLogoutResponse> {
    await this.prisma.staffSession.update({
      where: { id: session.sessionId },
      data: { revokedAt: new Date() },
    });
    return HqLogoutResponseSchema.parse({ success: true });
  }

  async getSession(session: StaffSessionContext): Promise<HqSessionResponse> {
    const staff = await this.prisma.staffUser.findUniqueOrThrow({ where: { id: session.staffId } });
    return HqSessionResponseSchema.parse({ staff: toPublicStaffDto(staff) });
  }
}
