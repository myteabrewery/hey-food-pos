import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type {
  AdminStaffDetailResponse,
  AdminStaffListResponse,
  CreateStaffResponse,
  ResetStaffPinResponse,
  SetStaffActiveResponse,
  UpdateStaffResponse,
} from "@hey-food/api-client";
import {
  AdminStaffListQuerySchema,
  CreateStaffRequestSchema,
  ResetStaffPinRequestSchema,
  UpdateStaffRequestSchema,
} from "@hey-food/api-client";

import { AdminStaffService } from "./admin-staff.service";
import { HqAdminKeyGuard } from "./hq-admin-key.guard";

/**
 * HQ Staff: accounts, role and outlet assignment (dev spec 6/9.4, blueprint
 * Section 13). ALL of it sits behind the TEMPORARY shared HQ admin key (see
 * HqAdminKeyGuard) — see the CRITICAL banner at the top of README.md. This is
 * the first screen writing real credentials (`pinHash`); see AdminStaffService's
 * doc comment for what that does and does not mean today.
 *
 * Every request body is a strict schema from api-client: unknown keys are a
 * 400, never silently dropped.
 */
@Controller("admin")
@UseGuards(HqAdminKeyGuard)
export class AdminStaffController {
  constructor(private readonly adminStaff: AdminStaffService) {}

  @Get("staff")
  async list(@Query("businessId") businessId: string | undefined): Promise<AdminStaffListResponse> {
    const query = AdminStaffListQuerySchema.parse({ businessId });
    return this.adminStaff.listStaff(query.businessId);
  }

  @Post("staff")
  async create(@Body() body: unknown): Promise<CreateStaffResponse> {
    return this.adminStaff.createStaff(CreateStaffRequestSchema.parse(body));
  }

  @Get("staff/:id")
  async detail(@Param("id") id: string): Promise<AdminStaffDetailResponse> {
    return this.adminStaff.getStaff(id);
  }

  /** Name/phone/role/outlets only — never the PIN or active state; those are their own actions below. */
  @Patch("staff/:id")
  async update(@Param("id") id: string, @Body() body: unknown): Promise<UpdateStaffResponse> {
    return this.adminStaff.updateStaff(id, UpdateStaffRequestSchema.parse(body));
  }

  @Post("staff/:id/reset-pin")
  @HttpCode(200)
  async resetPin(@Param("id") id: string, @Body() body: unknown): Promise<ResetStaffPinResponse> {
    const { pin } = ResetStaffPinRequestSchema.parse(body);
    return this.adminStaff.resetPin(id, pin);
  }

  /** No delete: a departed staff member is deactivated, never removed (README). */
  @Post("staff/:id/deactivate")
  @HttpCode(200)
  async deactivate(@Param("id") id: string): Promise<SetStaffActiveResponse> {
    return this.adminStaff.deactivate(id);
  }

  @Post("staff/:id/reactivate")
  @HttpCode(200)
  async reactivate(@Param("id") id: string): Promise<SetStaffActiveResponse> {
    return this.adminStaff.reactivate(id);
  }
}
