import { Body, Controller, Get, Headers, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import type { CreateGuestOrderResponse, OrderDetailResponse, PayOrderResponse } from "@hey-food/api-client";
import { CreateGuestOrderRequestSchema } from "@hey-food/api-client";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";

import { PaymentsService } from "../payments/payments.service";
import { GuestOrdersService } from "./guest-orders.service";
import { toOrderDto } from "./order.mapper";

/**
 * Guest web checkout's order creation. Rate-limited per client IP — this is
 * the one unauthenticated write endpoint, so it is the abuse target (the
 * limit is per-controller, not global, because the web app's server-side
 * menu fetches all arrive from one IP and must not share a budget with it).
 */
@Controller("guest/orders")
@UseGuards(ThrottlerGuard)
export class GuestOrdersController {
  constructor(private readonly guestOrders: GuestOrdersService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ): Promise<CreateGuestOrderResponse> {
    const request = CreateGuestOrderRequestSchema.parse(body);
    return this.guestOrders.createGuestOrder(request, idempotencyKey);
  }
}

/**
 * Order read + pay, authorized by the guest token (`Authorization: Bearer`)
 * rather than a JWT — there is no customer auth yet. When app auth lands, a
 * customer's own token is accepted here alongside the guest token.
 */
@Controller("orders")
@UseGuards(ThrottlerGuard)
export class OrdersController {
  constructor(
    private readonly guestOrders: GuestOrdersService,
    private readonly payments: PaymentsService,
  ) {}

  // Polled by the order page every few seconds.
  @Get(":id")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async detail(
    @Param("id") id: string,
    @Headers("authorization") authorization: string | undefined,
  ): Promise<OrderDetailResponse> {
    return toOrderDto(await this.guestOrders.authorizeGuest(id, authorization));
  }

  @Post(":id/pay")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async pay(
    @Param("id") id: string,
    @Headers("authorization") authorization: string | undefined,
  ): Promise<PayOrderResponse> {
    await this.guestOrders.authorizeGuest(id, authorization);
    return this.payments.startPayment(id);
  }
}
