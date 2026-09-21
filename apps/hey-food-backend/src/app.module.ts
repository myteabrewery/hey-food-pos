import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { AdminModule } from "./admin/admin.module";
import { OrdersModule } from "./orders/orders.module";
import { OutletsModule } from "./outlets/outlets.module";
import { PosModule } from "./pos/pos.module";
import { PrismaModule } from "./prisma/prisma.module";

// Root module — Hey Food Backend Platform.
// Real PaymentService (Billplz + webhooks), the staff-driven order state
// transitions, POS auth, and notification modules per
// docs/hey-food-developer-spec-v1.md are not yet implemented; what exists
// today is guest order creation, a STUBBED payment step, and a read-only POS
// queue (see docs/STATUS.md and the README's Pre-launch checklist).
//
// ScheduleModule is registered here to back the notification-outbox and
// dashboard-aggregation cron jobs (dev spec Sections 6 & 9.1) directly in-process,
// rather than introducing a separate queue/worker service before there's a load
// reason to (see README for the reasoning).
@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, OutletsModule, OrdersModule, PosModule, AdminModule],
})
export class AppModule {}
