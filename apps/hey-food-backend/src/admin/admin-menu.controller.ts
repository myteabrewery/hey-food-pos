import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type {
  AdminProductDetailResponse,
  AdminProductListResponse,
  CreateProductResponse,
  UpdateOutletProductOverrideResponse,
  UpdateProductResponse,
} from "@hey-food/api-client";
import {
  AdminProductListQuerySchema,
  CreateProductRequestSchema,
  UpdateOutletProductOverrideRequestSchema,
  UpdateProductRequestSchema,
} from "@hey-food/api-client";

import { CurrentStaffSession } from "../staff/current-staff-session.decorator";
import { HqAdminSessionGuard } from "../staff/hq-session.guard";
import type { StaffSessionContext } from "../staff/staff-session.guard";
import { AdminMenuService } from "./admin-menu.service";

/**
 * HQ Product / Menu Management. EVERY route here can change prices or
 * availability for the whole business. Guarded by `HqAdminSessionGuard` —
 * real HQ login, `hq_admin` only for now (see that guard's doc comment).
 *
 * Every request body is a strict schema from api-client: unknown keys are a
 * 400, never silently dropped. `businessId` is never one of them — it comes
 * from `session.businessId`.
 */
@Controller("admin")
@UseGuards(HqAdminSessionGuard)
export class AdminMenuController {
  constructor(private readonly adminMenu: AdminMenuService) {}

  /** Master Menu List: the business's products with per-outlet variance counts. */
  @Get("products")
  async list(@CurrentStaffSession() session: StaffSessionContext, @Query() query: Record<string, unknown>): Promise<AdminProductListResponse> {
    AdminProductListQuerySchema.parse(query);
    return this.adminMenu.listProducts(session.businessId);
  }

  /** Create a product (master fields only). It is orderable at every outlet immediately. */
  @Post("products")
  async create(@CurrentStaffSession() session: StaffSessionContext, @Body() body: unknown): Promise<CreateProductResponse> {
    return this.adminMenu.createProduct(session.businessId, session.staffId, CreateProductRequestSchema.parse(body));
  }

  /** Product Detail: the product, one row per outlet (with the server-computed variance flag), recent changes. */
  @Get("products/:id")
  async detail(@CurrentStaffSession() session: StaffSessionContext, @Param("id") id: string): Promise<AdminProductDetailResponse> {
    return this.adminMenu.getProduct(session.businessId, id);
  }

  /** Edit master fields only; never touches per-outlet data. */
  @Patch("products/:id")
  async update(@CurrentStaffSession() session: StaffSessionContext, @Param("id") id: string, @Body() body: unknown): Promise<UpdateProductResponse> {
    return this.adminMenu.updateProduct(session.businessId, session.staffId, id, UpdateProductRequestSchema.parse(body));
  }

  /** HQ's override: isAvailable and/or priceOverride (null clears the price). */
  @Patch("outlets/:outletId/products/:productId")
  async updateOverride(
    @CurrentStaffSession() session: StaffSessionContext,
    @Param("outletId") outletId: string,
    @Param("productId") productId: string,
    @Body() body: unknown,
  ): Promise<UpdateOutletProductOverrideResponse> {
    return this.adminMenu.updateOverride(session.businessId, session.staffId, outletId, productId, UpdateOutletProductOverrideRequestSchema.parse(body));
  }
}
