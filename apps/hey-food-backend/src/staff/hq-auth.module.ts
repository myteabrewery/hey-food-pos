import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";

import { HqAuthController } from "./hq-auth.controller";
import { HqAuthService } from "./hq-auth.service";
import { HqAdminSessionGuard, HqSessionGuard } from "./hq-session.guard";

@Module({
  imports: [
    // Self-contained, same pattern as PosAuthModule's own ThrottlerModule.forRoot —
    // not a global guard, applied per-route with @Throttle (see HqAuthController).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
  ],
  controllers: [HqAuthController],
  providers: [HqAuthService, HqSessionGuard, HqAdminSessionGuard],
  exports: [HqSessionGuard, HqAdminSessionGuard],
})
export class HqAuthModule {}
