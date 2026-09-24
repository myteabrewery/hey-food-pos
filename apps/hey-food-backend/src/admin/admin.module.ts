import { Module } from "@nestjs/common";

import { AdminCustomersController } from "./admin-customers.controller";
import { AdminCustomersService } from "./admin-customers.service";
import { AdminMenuController } from "./admin-menu.controller";
import { AdminMenuService } from "./admin-menu.service";
import { AdminOrdersController } from "./admin-orders.controller";
import { AdminOrdersService } from "./admin-orders.service";
import { AdminStaffController } from "./admin-staff.controller";
import { AdminStaffService } from "./admin-staff.service";
import { HqAdminKeyGuard } from "./hq-admin-key.guard";

@Module({
  controllers: [AdminMenuController, AdminOrdersController, AdminStaffController, AdminCustomersController],
  providers: [HqAdminKeyGuard, AdminMenuService, AdminOrdersService, AdminStaffService, AdminCustomersService],
})
export class AdminModule {}
