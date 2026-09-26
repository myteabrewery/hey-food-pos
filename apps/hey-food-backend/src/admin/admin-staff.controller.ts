import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type {
  AdminStaffDetailResponse,
  AdminStaffListResponse,
  CreateStaffResponse,
  ResetStaffPasswordResponse,
  ResetStaffPinResponse,
  SetStaffActiveResponse,
  UpdateStaffResponse,
} from "@hey-food/api-client";
import {
  AdminStaffListQuerySchema,
  CreateStaffRequestSchema,
  ResetStaffPasswordRequestSchema,
  ResetStaffPinRequestSchema,
  UpdateStaffRequestSchema,
} from "@hey-food/api-client";

import { CurrentStaffSession } from "../staff/current-staff-session.decorator";
import { HqAdminSessionGuard } from "../staff/hq-session.guard";
import type { StaffSessionContext } from "../staff/staff-session.guard";
import { AdminStaffService } from "./admin-staff.service";

/**
 * HQ Staff: accounts, role and outlet assignment (dev spec 6/9.4, blueprint
 * Section 13). Guarded by `HqAdminSessionGuard` — real HQ login, `hq_admin`
 * only for now (see that guard's doc comment). This is the first screen
 * writing real credentials (`pinHash`/`passwordHash`); see AdminStaffService's
 * doc comment for what that does and does not mean today.
 *
 * Every request body is a strict schema from api-client: unknown keys are a
 * 400, never silently dropped. `businessId` is never one of them — it comes
 * from `session.businessId`.
 */
@Controller("admin")
@UseGuards(HqAdminSessionGuard)
export class AdminStaffController {
  constructor(private readonly adminStaff: AdminStaffService) {}

  @Get("staff")
  async list(@CurrentStaffSession() session: StaffSessionContext, @Query() query: Record<string, unknown>): Promise<AdminStaffListResponse> {
    AdminStaffListQuerySchema.parse(query);
    return this.adminStaff.listStaff(session.businessId);
  }

  @Post("staff")
  async create(@CurrentStaffSession() session: StaffSessionContext, @Body() body: unknown): Promise<CreateStaffResponse> {
    return this.adminStaff.createStaff(session.businessId, CreateStaffRequestSchema.parse(body));
  }

  @Get("staff/:id")
  async detail(@CurrentStaffSession() session: StaffSessionContext, @Param("id") id: string): Promise<AdminStaffDetailResponse> {
    return this.adminStaff.getStaff(session.businessId, id);
  }

  /** Name/phone/role/outlets only — never the PIN, password, or active state; those are their own actions below. */
  @Patch("staff/:id")
  async update(@CurrentStaffSession() session: StaffSessionContext, @Param("id") id: string, @Body() body: unknown): Promise<UpdateStaffResponse> {
    return this.adminStaff.updateStaff(session.businessId, id, UpdateStaffRequestSchema.parse(body));
  }

  @Post("staff/:id/reset-pin")
  @HttpCode(200)
  async resetPin(@CurrentStaffSession() session: StaffSessionContext, @Param("id") id: string, @Body() body: unknown): Promise<ResetStaffPinResponse> {
    const { pin } = ResetStaffPinRequestSchema.parse(body);
    return this.adminStaff.resetPin(session.businessId, id, pin);
  }

  /** Sets a new HQ password — also how a staff member freshly promoted into hq_admin/area_manager gets their first one. */
  @Post("staff/:id/reset-password")
  @HttpCode(200)
  async resetPassword(@CurrentStaffSession() session: StaffSessionContext, @Param("id") id: string, @Body() body: unknown): Promise<ResetStaffPasswordResponse> {
    const { password } = ResetStaffPasswordRequestSchema.parse(body);
    return this.adminStaff.resetPassword(session.businessId, id, password);
  }

  /** No delete: a departed staff member is deactivated, never removed (README). */
  @Post("staff/:id/deactivate")
  @HttpCode(200)
  async deactivate(@CurrentStaffSession() session: StaffSessionContext, @Param("id") id: string): Promise<SetStaffActiveResponse> {
    return this.adminStaff.deactivate(session.businessId, id);
  }

  @Post("staff/:id/reactivate")
  @HttpCode(200)
  async reactivate(@CurrentStaffSession() session: StaffSessionContext, @Param("id") id: string): Promise<SetStaffActiveResponse> {
    return this.adminStaff.reactivate(session.businessId, id);
  }
}
