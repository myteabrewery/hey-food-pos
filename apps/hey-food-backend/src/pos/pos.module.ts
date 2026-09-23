import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { PosAuthModule } from "../staff/pos-auth.module";
import { PosMenuController } from "./pos-menu.controller";
import { PosMenuService } from "./pos-menu.service";
import { PosOrdersController } from "./pos-orders.controller";
import { PosOrdersService } from "./pos-orders.service";

@Module({
  imports: [NotificationsModule, PosAuthModule],
  controllers: [PosOrdersController, PosMenuController],
  providers: [PosOrdersService, PosMenuService],
})
export class PosModule {}
