import { Module } from "@nestjs/common";

import { PosDeviceKeyGuard } from "./pos-device-key.guard";
import { PosOrdersController } from "./pos-orders.controller";

@Module({
  controllers: [PosOrdersController],
  providers: [PosDeviceKeyGuard],
})
export class PosModule {}
