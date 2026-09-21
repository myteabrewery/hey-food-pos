import { Module } from "@nestjs/common";

import { isPushStubEnabled, isSmsStubEnabled } from "../common/env";
import { LoggingPushProvider } from "./logging-push.provider";
import { LoggingSmsProvider } from "./logging-sms.provider";
import { PUSH_PROVIDER, SMS_PROVIDER } from "./notification-provider";
import { NotificationsService } from "./notifications.service";

/**
 * Notifications, behind two provider interfaces. Today the only providers are
 * the logging STUBS, each gated by its own flag (PUSH_STUB_ENABLED /
 * SMS_STUB_ENABLED); with a flag off the provider is `null` and the service
 * records that channel's attempts as failed ("no provider configured") rather
 * than skipping them. A real FCM / SMS provider replaces the matching factory
 * below and nothing else.
 */
@Module({
  providers: [
    { provide: PUSH_PROVIDER, useFactory: () => (isPushStubEnabled() ? new LoggingPushProvider() : null) },
    { provide: SMS_PROVIDER, useFactory: () => (isSmsStubEnabled() ? new LoggingSmsProvider() : null) },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
