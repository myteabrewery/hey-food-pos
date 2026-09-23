import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";

import { PosAuthController } from "./pos-auth.controller";
import { PosAuthService } from "./pos-auth.service";
import { StaffSessionGuard } from "./staff-session.guard";

@Module({
  imports: [
    // Self-contained, same pattern as OrdersModule's own ThrottlerModule.forRoot —
    // not a global guard, applied per-route with @Throttle (see PosAuthController).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
  ],
  controllers: [PosAuthController],
  providers: [PosAuthService, StaffSessionGuard],
  exports: [StaffSessionGuard],
})
export class PosAuthModule {}
