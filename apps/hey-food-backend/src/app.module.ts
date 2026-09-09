import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { OutletsModule } from "./outlets/outlets.module";
import { PrismaModule } from "./prisma/prisma.module";

// Root module — Hey Food Backend Platform.
// PaymentService, order state machine, and webhook/notification modules per
// docs/hey-food-developer-spec-v1.md are not yet implemented.
//
// ScheduleModule is registered here to back the notification-outbox and
// dashboard-aggregation cron jobs (dev spec Sections 6 & 9.1) directly in-process,
// rather than introducing a separate queue/worker service before there's a load
// reason to (see README for the reasoning).
@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, OutletsModule],
})
export class AppModule {}
