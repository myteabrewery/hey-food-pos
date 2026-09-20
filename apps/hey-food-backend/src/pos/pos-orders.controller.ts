import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { CancelOrderResponse, PosQueueResponse, UpdateOrderStatusResponse } from "@hey-food/api-client";
import { CancelOrderRequestSchema, UpdateOrderStatusRequestSchema } from "@hey-food/api-client";

import { ApiException } from "../common/api-exception";
import { PosDeviceKeyGuard } from "./pos-device-key.guard";
import { PosOrdersService } from "./pos-orders.service";

/**
 * The POS's order endpoints: the live queue (read) and the staff write paths
 * (status transitions, cancel). ALL of it sits behind the TEMPORARY shared
 * device key (see PosDeviceKeyGuard) — which now also means anyone holding
 * that key can move or cancel ANY outlet's orders, not just read them. The
 * key is not per-device, not outlet-bound and ships inside the POS bundle.
 * Real staff PIN + device-bound auth must replace it before production.
 */
@Controller("pos")
@UseGuards(PosDeviceKeyGuard)
export class PosOrdersController {
  constructor(private readonly posOrders: PosOrdersService) {}

  /** The outlet's live queue; also the `paid -> received` sync (see the service). */
  @Get("outlets/:outletId/orders")
  async queue(@Param("outletId") outletId: string): Promise<PosQueueResponse> {
    return this.posOrders.listQueue(outletId);
  }

  /**
   * Start / Ready / Collect. The body is the narrow union api-client fixed
   * (`preparing | ready | collected`); the state machine is enforced by the
   * service — 409 INVALID_STATUS_TRANSITION for anything that skips a state.
   */
  @Patch("orders/:id/status")
  async updateStatus(@Param("id") id: string, @Body() body: unknown): Promise<UpdateOrderStatusResponse> {
    const { status } = UpdateOrderStatusRequestSchema.parse(body);
    return this.posOrders.advance(id, status);
  }

  /** Staff cancel: one of four typed reasons, free-text detail only for "other". */
  @Post("orders/:id/cancel")
  @HttpCode(200)
  async cancel(@Param("id") id: string, @Body() body: unknown): Promise<CancelOrderResponse> {
    const request = CancelOrderRequestSchema.parse(body);
    if (request.actor !== "staff") {
      // customer / hq cancellations are a different endpoint and different auth.
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "ACTOR_NOT_ALLOWED",
        'This endpoint only accepts staff cancellations (actor "staff").',
      );
    }
    return this.posOrders.cancel(id, request);
  }
}
