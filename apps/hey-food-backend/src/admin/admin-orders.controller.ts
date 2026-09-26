import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { AdminCancelOrderResponse, AdminOrderDetailResponse, AdminOrderListResponse } from "@hey-food/api-client";
import { AdminCancelOrderRequestSchema, AdminOrderListQuerySchema } from "@hey-food/api-client";

import { CurrentStaffSession } from "../staff/current-staff-session.decorator";
import { HqAdminSessionGuard } from "../staff/hq-session.guard";
import type { StaffSessionContext } from "../staff/staff-session.guard";
import { AdminOrdersService } from "./admin-orders.service";

/**
 * HQ Orders: read every outlet's orders (including a masked customer phone) and
 * CANCEL any of them. Guarded by `HqAdminSessionGuard` — real HQ login,
 * `hq_admin` only for now (see that guard's doc comment; this is the screen
 * the dev spec's own permissions matrix most clearly grants `area_manager`
 * scoped access to, and so the natural first candidate for that follow-on).
 *
 * Query strings and request bodies are strict schemas from api-client: an
 * unknown filter or key is a 400, never silently ignored. `businessId` is
 * never one of them — it comes from `session.businessId`.
 */
@Controller("admin")
@UseGuards(HqAdminSessionGuard)
export class AdminOrdersController {
  constructor(private readonly adminOrders: AdminOrdersService) {}

  /** Filterable, cursor-paginated order list across all outlets (newest first; hides `pending` by default). */
  @Get("orders")
  async list(@CurrentStaffSession() session: StaffSessionContext, @Query() query: Record<string, unknown>): Promise<AdminOrderListResponse> {
    return this.adminOrders.listOrders(session.businessId, AdminOrderListQuerySchema.parse(query));
  }

  /** One order in full: items + modifiers, timeline, payment, notification attempts. */
  @Get("orders/:id")
  async detail(@CurrentStaffSession() session: StaffSessionContext, @Param("id") id: string): Promise<AdminOrderDetailResponse> {
    return this.adminOrders.getOrder(session.businessId, id);
  }

  /**
   * HQ cancellation — DEVIATES from dev spec Section 2's single shared
   * `POST /orders/:id/cancel`: it is its own route so a POS session can never
   * reach it (and this session can never reach the POS's). Recorded as
   * `cancel_source = hq`, now with a real staffId too.
   */
  @Post("orders/:id/cancel")
  @HttpCode(200)
  async cancel(@CurrentStaffSession() session: StaffSessionContext, @Param("id") id: string, @Body() body: unknown): Promise<AdminCancelOrderResponse> {
    return this.adminOrders.cancel(session.businessId, id, session.staffId, AdminCancelOrderRequestSchema.parse(body));
  }
}
