import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";

import { PaymentsModule } from "../payments/payments.module";
import { GuestOrdersService } from "./guest-orders.service";
import { OrderCreationService } from "./order-creation.service";
import { GuestOrdersController, OrdersController } from "./orders.controller";

@Module({
  imports: [
    // Default budget for any endpoint that opts in with ThrottlerGuard;
    // individual routes override it with @Throttle. Not registered as a
    // global guard on purpose — see GuestOrdersController.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PaymentsModule,
  ],
  controllers: [GuestOrdersController, OrdersController],
  providers: [OrderCreationService, GuestOrdersService],
  exports: [OrderCreationService],
})
export class OrdersModule {}
