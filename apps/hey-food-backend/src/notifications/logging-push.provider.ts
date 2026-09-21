import { Logger } from "@nestjs/common";

import { getStubFaultMode } from "../common/env";
import { LOGGING_STUB_NAME, type NotificationMessage, type ProviderResult, type PushProvider } from "./notification-provider";
import { injectStubFault } from "./stub-fault";

/**
 * ############################################################################
 * TEMPORARY STAND-IN FOR A REAL PUSH PROVIDER (FCM) — SENDS NOTHING.
 * ############################################################################
 * Logs what it WOULD have pushed and reports `accepted`. There is nothing to
 * send to even with a real provider today: no device-token registry exists and
 * the Customer App has no push code. Only registered when PUSH_STUB_ENABLED=
 * true; a production process refuses to start with that flag set. Every
 * NotificationLog row it produces says `provider: "logging-stub"` and
 * `stub: true`, and `delivered` stays false. Listed in the README's
 * Pre-launch checklist.
 */
export class LoggingPushProvider implements PushProvider {
  readonly name = LOGGING_STUB_NAME;
  private readonly logger = new Logger("STUB PUSH");

  async send(customerId: string, message: NotificationMessage): Promise<ProviderResult> {
    const fault = await injectStubFault(getStubFaultMode("PUSH"), "PUSH_STUB_FAIL");
    if (fault !== null) {
      return fault;
    }

    const providerMessageId = `stub-push-${Date.now().toString(36)}`;
    this.logger.warn(
      `NOT SENT (logging stub) — would push to customer ${customerId}: "${message.title}" / "${message.body}" [${providerMessageId}]`,
    );
    return { accepted: true, providerMessageId };
  }
}
