import { HttpStatus, Injectable } from "@nestjs/common";
import type { PayOrderResponse } from "@hey-food/api-client";
import { PayOrderResponseSchema } from "@hey-food/api-client";

import { ApiException } from "../common/api-exception";
import { getWebOrigin } from "../common/env";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentStubService } from "./payment-stub.service";

/**
 * "Start paying for this order" — what POST /orders/:id/pay does. Today that
 * is the payment STUB (see PaymentStubService); the Billplz integration will
 * replace the `markPaid` line with "create a Billplz bill and return its URL"
 * and leave the contract, callers and the rest of this class unchanged.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentStub: PaymentStubService,
  ) {}

  async startPayment(orderId: string): Promise<PayOrderResponse> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    if (order.status === "cancelled") {
      throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_PAYABLE", "This order was cancelled.");
    }

    // Already past `pending` (paid, in the kitchen, ...): paying again is a
    // harmless no-op that returns the same destination, so a double tap or a
    // retry never errors or double-charges.
    if (order.status === "pending") {
      await this.paymentStub.markPaid(order.id);
    }

    return PayOrderResponseSchema.parse({
      // Where the browser goes next. With Billplz this becomes the hosted
      // payment page, which itself sends the customer back to this URL.
      redirectUrl: `${getWebOrigin()}/o/${encodeURIComponent(order.outletId)}/order/${encodeURIComponent(order.id)}`,
      isStub: true,
    });
  }
}
