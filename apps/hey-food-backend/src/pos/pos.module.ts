import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { PosDeviceKeyGuard } from "./pos-device-key.guard";
import { PosMenuController } from "./pos-menu.controller";
import { PosMenuService } from "./pos-menu.service";
import { PosOrdersController } from "./pos-orders.controller";
import { PosOrdersService } from "./pos-orders.service";

@Module({
  imports: [NotificationsModule],
  controllers: [PosOrdersController, PosMenuController],
  providers: [PosDeviceKeyGuard, PosOrdersService, PosMenuService],
})
export class PosModule {}
