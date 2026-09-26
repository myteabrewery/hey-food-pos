import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { AdminModule } from "./admin/admin.module";
import { OrdersModule } from "./orders/orders.module";
import { OutletsModule } from "./outlets/outlets.module";
import { PosModule } from "./pos/pos.module";
import { PrismaModule } from "./prisma/prisma.module";
import { HqAuthModule } from "./staff/hq-auth.module";
import { PosAuthModule } from "./staff/pos-auth.module";

// Root module — Hey Food Backend Platform.
// Real PaymentService (Billplz + webhooks) and the notification providers per
// docs/hey-food-developer-spec-v1.md are not yet implemented (see
// docs/STATUS.md and the README's Pre-launch checklist). Real POS staff PIN
// auth (PosAuthModule) guards every POS/order-write endpoint; real HQ web
// auth (HqAuthModule) now guards every /admin/* endpoint too, replacing the
// HQ_ADMIN_KEY stand-in outright — see AdminModule. Device binding (POS's
// dev spec 5.5 other half) and area_manager's per-screen scoping on HQ
// (Orders first) are both deliberately separate, still-unbuilt follow-ups.
//
// ScheduleModule is registered here to back the notification-outbox and
// dashboard-aggregation cron jobs (dev spec Sections 6 & 9.1) directly in-process,
// rather than introducing a separate queue/worker service before there's a load
// reason to (see README for the reasoning).
@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, OutletsModule, OrdersModule, PosModule, PosAuthModule, HqAuthModule, AdminModule],
})
export class AppModule {}
