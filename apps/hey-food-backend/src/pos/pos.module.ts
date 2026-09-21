import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { PosDeviceKeyGuard } from "./pos-device-key.guard";
import { PosOrdersController } from "./pos-orders.controller";
import { PosOrdersService } from "./pos-orders.service";

@Module({
  imports: [NotificationsModule],
  controllers: [PosOrdersController],
  providers: [PosDeviceKeyGuard, PosOrdersService],
})
export class PosModule {}
