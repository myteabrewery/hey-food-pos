import { Module } from "@nestjs/common";

import { AdminMenuController } from "./admin-menu.controller";
import { AdminMenuService } from "./admin-menu.service";
import { HqAdminKeyGuard } from "./hq-admin-key.guard";

@Module({
  controllers: [AdminMenuController],
  providers: [HqAdminKeyGuard, AdminMenuService],
})
export class AdminModule {}
