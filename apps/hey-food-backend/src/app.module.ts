import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { AdminModule } from "./admin/admin.module";
import { OrdersModule } from "./orders/orders.module";
import { OutletsModule } from "./outlets/outlets.module";
import { PosModule } from "./pos/pos.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PosAuthModule } from "./staff/pos-auth.module";

// Root module — Hey Food Backend Platform.
// Real PaymentService (Billplz + webhooks) and the notification providers per
// docs/hey-food-developer-spec-v1.md are not yet implemented (see
// docs/STATUS.md and the README's Pre-launch checklist). Real POS staff PIN
// auth now exists (PosAuthModule) and guards every POS/order-write endpoint;
// device binding (dev spec 5.5's other half) is a deliberately separate,
// still-unbuilt follow-up.
//
// ScheduleModule is registered here to back the notification-outbox and
// dashboard-aggregation cron jobs (dev spec Sections 6 & 9.1) directly in-process,
// rather than introducing a separate queue/worker service before there's a load
// reason to (see README for the reasoning).
@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, OutletsModule, OrdersModule, PosModule, PosAuthModule, AdminModule],
})
export class AppModule {}
