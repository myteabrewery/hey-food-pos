import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import type { AdminCustomerDetailResponse, AdminCustomerListResponse, AdminGuestCustomerDetailResponse, AdminGuestCustomerListResponse } from "@hey-food/api-client";
import { AdminCustomerDetailQuerySchema, AdminCustomerListQuerySchema, AdminGuestCustomerDetailQuerySchema, AdminGuestCustomerListQuerySchema } from "@hey-food/api-client";

import { CurrentStaffSession } from "../staff/current-staff-session.decorator";
import { HqAdminSessionGuard } from "../staff/hq-session.guard";
import type { StaffSessionContext } from "../staff/staff-session.guard";
import { AdminCustomersService } from "./admin-customers.service";

/**
 * HQ Customers (dev spec Section 2/9.4): App Accounts (the real `Customer`
 * entity) and Guest Orders by Phone (guest orders grouped by phone). Guarded
 * by `HqAdminSessionGuard` — real HQ login, `hq_admin` only for now (see
 * that guard's doc comment). Read-only — no write route.
 *
 * Query strings are strict schemas from api-client: an unknown filter is a
 * 400, never silently ignored. `businessId` is never one of them — it comes
 * from `session.businessId`.
 */
@Controller("admin")
@UseGuards(HqAdminSessionGuard)
export class AdminCustomersController {
  constructor(private readonly adminCustomers: AdminCustomersService) {}

  @Get("customers")
  async listCustomers(@CurrentStaffSession() session: StaffSessionContext, @Query() query: Record<string, unknown>): Promise<AdminCustomerListResponse> {
    return this.adminCustomers.listCustomers(session.businessId, AdminCustomerListQuerySchema.parse(query));
  }

  @Get("customers/:id")
  async getCustomer(@CurrentStaffSession() session: StaffSessionContext, @Param("id") id: string, @Query() query: Record<string, unknown>): Promise<AdminCustomerDetailResponse> {
    return this.adminCustomers.getCustomer(session.businessId, id, AdminCustomerDetailQuerySchema.parse(query));
  }

  @Get("guest-customers")
  async listGuestCustomers(@CurrentStaffSession() session: StaffSessionContext, @Query() query: Record<string, unknown>): Promise<AdminGuestCustomerListResponse> {
    return this.adminCustomers.listGuestCustomers(session.businessId, AdminGuestCustomerListQuerySchema.parse(query));
  }

  @Get("guest-customers/:key")
  async getGuestCustomer(@CurrentStaffSession() session: StaffSessionContext, @Param("key") key: string, @Query() query: Record<string, unknown>): Promise<AdminGuestCustomerDetailResponse> {
    return this.adminCustomers.getGuestCustomer(session.businessId, key, AdminGuestCustomerDetailQuerySchema.parse(query));
  }
}
