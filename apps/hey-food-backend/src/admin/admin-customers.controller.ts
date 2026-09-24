import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import type { AdminCustomerDetailResponse, AdminCustomerListResponse, AdminGuestCustomerDetailResponse, AdminGuestCustomerListResponse } from "@hey-food/api-client";
import { AdminCustomerDetailQuerySchema, AdminCustomerListQuerySchema, AdminGuestCustomerDetailQuerySchema, AdminGuestCustomerListQuerySchema } from "@hey-food/api-client";

import { AdminCustomersService } from "./admin-customers.service";
import { HqAdminKeyGuard } from "./hq-admin-key.guard";

/**
 * HQ Customers (dev spec Section 2/9.4): App Accounts (the real `Customer`
 * entity) and Guest Orders by Phone (guest orders grouped by phone). Behind
 * the TEMPORARY shared HQ admin key like every other `/admin/*` route (see
 * the CRITICAL banner at the top of README.md). Read-only — no write route.
 *
 * Query strings are strict schemas from api-client: an unknown filter is a
 * 400, never silently ignored.
 */
@Controller("admin")
@UseGuards(HqAdminKeyGuard)
export class AdminCustomersController {
  constructor(private readonly adminCustomers: AdminCustomersService) {}

  @Get("customers")
  async listCustomers(@Query() query: Record<string, unknown>): Promise<AdminCustomerListResponse> {
    return this.adminCustomers.listCustomers(AdminCustomerListQuerySchema.parse(query));
  }

  @Get("customers/:id")
  async getCustomer(@Param("id") id: string, @Query() query: Record<string, unknown>): Promise<AdminCustomerDetailResponse> {
    return this.adminCustomers.getCustomer(id, AdminCustomerDetailQuerySchema.parse(query));
  }

  @Get("guest-customers")
  async listGuestCustomers(@Query() query: Record<string, unknown>): Promise<AdminGuestCustomerListResponse> {
    return this.adminCustomers.listGuestCustomers(AdminGuestCustomerListQuerySchema.parse(query));
  }

  @Get("guest-customers/:key")
  async getGuestCustomer(@Param("key") key: string, @Query() query: Record<string, unknown>): Promise<AdminGuestCustomerDetailResponse> {
    return this.adminCustomers.getGuestCustomer(key, AdminGuestCustomerDetailQuerySchema.parse(query));
  }
}
