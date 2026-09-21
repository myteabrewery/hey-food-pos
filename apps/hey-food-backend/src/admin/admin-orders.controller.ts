import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { AdminCancelOrderResponse, AdminOrderDetailResponse, AdminOrderListResponse } from "@hey-food/api-client";
import { AdminCancelOrderRequestSchema, AdminOrderListQuerySchema } from "@hey-food/api-client";

import { AdminOrdersService } from "./admin-orders.service";
import { HqAdminKeyGuard } from "./hq-admin-key.guard";

/**
 * HQ Orders: read every outlet's orders (including a masked customer phone) and
 * CANCEL any of them. ALL of it sits behind the TEMPORARY shared HQ admin key
 * (see HqAdminKeyGuard), which is not authentication; the HQ app has no login.
 * See the CRITICAL banner at the top of README.md.
 *
 * Query strings and request bodies are strict schemas from api-client: an
 * unknown filter or key is a 400, never silently ignored.
 */
@Controller("admin")
@UseGuards(HqAdminKeyGuard)
export class AdminOrdersController {
  constructor(private readonly adminOrders: AdminOrdersService) {}

  /** Filterable, cursor-paginated order list across all outlets (newest first; hides `pending` by default). */
  @Get("orders")
  async list(@Query() query: Record<string, unknown>): Promise<AdminOrderListResponse> {
    return this.adminOrders.listOrders(AdminOrderListQuerySchema.parse(query));
  }

  /** One order in full: items + modifiers, timeline, payment, notification attempts. */
  @Get("orders/:id")
  async detail(@Param("id") id: string): Promise<AdminOrderDetailResponse> {
    return this.adminOrders.getOrder(id);
  }

  /**
   * HQ cancellation — DEVIATES from dev spec Section 2's single shared
   * `POST /orders/:id/cancel`: it is its own route so the POS device key can never
   * reach it (and this key can never reach the POS's). Recorded as `cancel_source = hq`.
   */
  @Post("orders/:id/cancel")
  @HttpCode(200)
  async cancel(@Param("id") id: string, @Body() body: unknown): Promise<AdminCancelOrderResponse> {
    return this.adminOrders.cancel(id, AdminCancelOrderRequestSchema.parse(body));
  }
}
