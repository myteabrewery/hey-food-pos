import { Module } from "@nestjs/common";

import { PaymentStubService } from "./payment-stub.service";
import { PaymentsService } from "./payments.service";

@Module({
  providers: [PaymentStubService, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
