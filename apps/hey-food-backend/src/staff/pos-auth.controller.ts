import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import type { StaffLoginResponse, StaffLogoutResponse } from "@hey-food/api-client";
import { StaffLoginRequestSchema } from "@hey-food/api-client";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";

import { CurrentStaffSession } from "./current-staff-session.decorator";
import { PosAuthService } from "./pos-auth.service";
import type { StaffSessionContext } from "./staff-session.guard";
import { StaffSessionGuard } from "./staff-session.guard";

/**
 * Real POS staff PIN login (dev spec 5.5), replacing POS_DEVICE_KEY. See
 * PosAuthService's doc comment and StaffLoginRequestSchema's for the full
 * design (businessId from the app's own config, deviceId opaque, outletId
 * only on a second call for an ambiguous area_manager).
 */
@Controller("auth/staff")
export class PosAuthController {
  constructor(private readonly posAuth: PosAuthService) {}

  /**
   * Rate-limited like guest order creation (the same "one unauthenticated
   * write endpoint is the abuse target" reasoning) — a 6-digit PIN is only a
   * million combinations, so this is the one place brute-forcing is a real
   * concern.
   */
  @Post("login")
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() body: unknown): Promise<StaffLoginResponse> {
    return this.posAuth.login(StaffLoginRequestSchema.parse(body));
  }

  /** Revokes THIS session only — other devices/sessions for the same staff member are unaffected. */
  @Post("logout")
  @HttpCode(200)
  @UseGuards(StaffSessionGuard)
  async logout(@CurrentStaffSession() session: StaffSessionContext): Promise<StaffLogoutResponse> {
    return this.posAuth.logout(session);
  }
}
