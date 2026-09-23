import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { CancelOrderResponse, PosQueueResponse, UpdateOrderStatusResponse } from "@hey-food/api-client";
import { CancelOrderRequestSchema, UpdateOrderStatusRequestSchema } from "@hey-food/api-client";

import { ApiException } from "../common/api-exception";
import { CurrentStaffSession } from "../staff/current-staff-session.decorator";
import type { StaffSessionContext } from "../staff/staff-session.guard";
import { StaffSessionGuard } from "../staff/staff-session.guard";
import { PosOrdersService } from "./pos-orders.service";

/**
 * The POS's order endpoints: the live queue (read) and the staff write paths
 * (status transitions, cancel). Guarded by a real staff PIN session
 * (StaffSessionGuard) — every request is scoped to the SESSION's own outlet,
 * regardless of what a route's own `:outletId` claims (see the service).
 */
@Controller("pos")
@UseGuards(StaffSessionGuard)
export class PosOrdersController {
  constructor(private readonly posOrders: PosOrdersService) {}

  /** The outlet's live queue; also the `paid -> received` sync (see the service). */
  @Get("outlets/:outletId/orders")
  async queue(@Param("outletId") outletId: string, @CurrentStaffSession() session: StaffSessionContext): Promise<PosQueueResponse> {
    return this.posOrders.listQueue(outletId, session);
  }

  /**
   * Start / Ready / Collect. The body is the narrow union api-client fixed
   * (`preparing | ready | collected`); the state machine is enforced by the
   * service — 409 INVALID_STATUS_TRANSITION for anything that skips a state.
   */
  @Patch("orders/:id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentStaffSession() session: StaffSessionContext,
  ): Promise<UpdateOrderStatusResponse> {
    const { status } = UpdateOrderStatusRequestSchema.parse(body);
    return this.posOrders.advance(id, status, session);
  }

  /** Staff cancel: one of four typed reasons, free-text detail only for "other". */
  @Post("orders/:id/cancel")
  @HttpCode(200)
  async cancel(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentStaffSession() session: StaffSessionContext,
  ): Promise<CancelOrderResponse> {
    const request = CancelOrderRequestSchema.parse(body);
    if (request.actor !== "staff") {
      // customer / hq cancellations are a different endpoint and different auth.
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "ACTOR_NOT_ALLOWED",
        'This endpoint only accepts staff cancellations (actor "staff").',
      );
    }
    return this.posOrders.cancel(id, request, session);
  }
}
