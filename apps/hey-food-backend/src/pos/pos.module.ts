import { Module } from "@nestjs/common";

import { PosDeviceKeyGuard } from "./pos-device-key.guard";
import { PosOrdersController } from "./pos-orders.controller";
import { PosOrdersService } from "./pos-orders.service";

@Module({
  controllers: [PosOrdersController],
  providers: [PosDeviceKeyGuard, PosOrdersService],
})
export class PosModule {}
