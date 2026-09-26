import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import type { HqLoginResponse, HqLogoutResponse, HqSessionResponse } from "@hey-food/api-client";
import { HqLoginRequestSchema } from "@hey-food/api-client";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";

import { CurrentStaffSession } from "./current-staff-session.decorator";
import { HqAuthService } from "./hq-auth.service";
import { HqSessionGuard } from "./hq-session.guard";
import type { StaffSessionContext } from "./staff-session.guard";

/**
 * Real HQ web login (dev spec §5.5 area, blueprint §6 screen 1), replacing
 * `HQ_ADMIN_KEY`. See HqAuthService's doc comment for the full design.
 */
@Controller("auth/hq")
export class HqAuthController {
  constructor(private readonly hqAuth: HqAuthService) {}

  /** Rate-limited like POS login — one real, unauthenticated write endpoint is the abuse target either way. */
  @Post("login")
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() body: unknown): Promise<HqLoginResponse> {
    return this.hqAuth.login(HqLoginRequestSchema.parse(body));
  }

  /** Revokes THIS session only. Works for hq_admin or area_manager — logging out must always work regardless of role. */
  @Post("logout")
  @HttpCode(200)
  @UseGuards(HqSessionGuard)
  async logout(@CurrentStaffSession() session: StaffSessionContext): Promise<HqLogoutResponse> {
    return this.hqAuth.logout(session);
  }

  /**
   * "Who is this" — the HQ Next.js server re-resolves this on each render
   * from the httpOnly cookie rather than remembering the login response, so
   * a revocation/deactivation is reflected the moment the page next loads,
   * not just on the next login attempt. Works for hq_admin or area_manager.
   */
  @Get("session")
  @UseGuards(HqSessionGuard)
  async session(@CurrentStaffSession() session: StaffSessionContext): Promise<HqSessionResponse> {
    return this.hqAuth.getSession(session);
  }
}
