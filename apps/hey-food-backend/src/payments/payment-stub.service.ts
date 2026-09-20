import { HttpStatus, Injectable, Logger } from "@nestjs/common";

import { ApiException } from "../common/api-exception";
import { isPaymentStubEnabled } from "../common/env";
import { PrismaService } from "../prisma/prisma.service";

/**
 * ############################################################################
 * TEMPORARY STAND-IN FOR REAL PAYMENT — DELETE WHEN BILLPLZ LANDS.
 * ############################################################################
 * `markPaid` flips an order to `paid` WITHOUT TAKING ANY MONEY. It exists only
 * so the rest of the order pipeline (guest checkout -> POS queue) can be built
 * and exercised end to end before the Billplz integration does.
 *
 * Safeguards, so it can't quietly ship:
 *  - Off unless PAYMENT_STUB_ENABLED=true; otherwise the pay endpoint answers
 *    501 and nothing can become paid.
 *  - A production process REFUSES TO START with the flag on
 *    (common/env.ts -> assertNoTempStandInsInProduction).
 *  - Every use logs a [STUB PAYMENT] warning; the pay response carries
 *    `isStub: true`, which the web app shows as a test-mode banner.
 *  - No `Payment` row is written (the PaymentProvider enum has no stub value
 *    and `webhookPayload` is required, and a schema change for something
 *    temporary isn't worth it). So "status paid, paymentId NULL" is the
 *    signature of a stub-paid order and is easy to find and audit.
 *
 * Listed in the README's Pre-launch checklist and docs/STATUS.md.
 */
@Injectable()
export class PaymentStubService {
  private readonly logger = new Logger("STUB PAYMENT");

  constructor(private readonly prisma: PrismaService) {}

  /**
   * pending -> paid, idempotently. Returns once the order is paid (whether by
   * this call or an earlier one); throws if it can't be.
   */
  async markPaid(orderId: string): Promise<void> {
    if (!isPaymentStubEnabled()) {
      throw new ApiException(
        HttpStatus.NOT_IMPLEMENTED,
        "PAYMENT_NOT_IMPLEMENTED",
        "Online payment is not available yet.",
      );
    }

    // Conditional update: only a still-pending order flips, and only once,
    // even if two pay calls race.
    const { count } = await this.prisma.order.updateMany({
      where: { id: orderId, status: "pending" },
      data: { status: "paid", paidAt: new Date() },
    });

    if (count === 1) {
      this.logger.warn(`Order ${orderId} marked PAID WITHOUT PAYMENT (PAYMENT_STUB_ENABLED). Temporary stand-in for Billplz.`);
    }
  }
}
