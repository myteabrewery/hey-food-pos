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

import { AdminMenuService } from "./admin-menu.service";
import { HqAdminKeyGuard } from "./hq-admin-key.guard";

/**
 * HQ Product / Menu Management. EVERY route here can change prices or
 * availability for the whole business, and ALL of it sits behind the TEMPORARY
 * shared HQ admin key (see HqAdminKeyGuard) — which is not authentication and
 * is only as safe as the HQ app that holds it (which has no login). See the
 * CRITICAL banner at the top of README.md.
 *
 * Every request body is a strict schema from api-client: unknown keys are a
 * 400, never silently dropped.
 */
@Controller("admin")
@UseGuards(HqAdminKeyGuard)
export class AdminMenuController {
  constructor(private readonly adminMenu: AdminMenuService) {}

  /** Master Menu List: the business's products with per-outlet variance counts. */
  @Get("products")
  async list(@Query("businessId") businessId: string | undefined): Promise<AdminProductListResponse> {
    const query = AdminProductListQuerySchema.parse({ businessId });
    return this.adminMenu.listProducts(query.businessId);
  }

  /** Create a product (master fields only). It is orderable at every outlet immediately. */
  @Post("products")
  async create(@Body() body: unknown): Promise<CreateProductResponse> {
    return this.adminMenu.createProduct(CreateProductRequestSchema.parse(body));
  }

  /** Product Detail: the product, one row per outlet (with the server-computed variance flag), recent changes. */
  @Get("products/:id")
  async detail(@Param("id") id: string): Promise<AdminProductDetailResponse> {
    return this.adminMenu.getProduct(id);
  }

  /** Edit master fields only; never touches per-outlet data. */
  @Patch("products/:id")
  async update(@Param("id") id: string, @Body() body: unknown): Promise<UpdateProductResponse> {
    return this.adminMenu.updateProduct(id, UpdateProductRequestSchema.parse(body));
  }

  /** HQ's override: isAvailable and/or priceOverride (null clears the price). */
  @Patch("outlets/:outletId/products/:productId")
  async updateOverride(
    @Param("outletId") outletId: string,
    @Param("productId") productId: string,
    @Body() body: unknown,
  ): Promise<UpdateOutletProductOverrideResponse> {
    return this.adminMenu.updateOverride(outletId, productId, UpdateOutletProductOverrideRequestSchema.parse(body));
  }
}
