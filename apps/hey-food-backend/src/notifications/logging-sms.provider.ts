import { Logger } from "@nestjs/common";

import { getStubFaultMode } from "../common/env";
import { LOGGING_STUB_NAME, type ProviderResult, type SmsProvider } from "./notification-provider";
import { maskPhone } from "./phone-mask";
import { injectStubFault } from "./stub-fault";

/**
 * ############################################################################
 * TEMPORARY STAND-IN FOR A REAL SMS PROVIDER — SENDS NOTHING.
 * ############################################################################
 * Logs what it WOULD have texted and reports `accepted`. No SMS provider has
 * been chosen yet (the same open decision the OTP login is waiting on). Only
 * registered when SMS_STUB_ENABLED=true; a production process refuses to start
 * with that flag set. Every NotificationLog row it produces says
 * `provider: "logging-stub"` and `stub: true`, and `delivered` stays false, so
 * a customer this "notified" is distinguishable from one actually texted.
 * Listed in the README's Pre-launch checklist.
 */
export class LoggingSmsProvider implements SmsProvider {
  readonly name = LOGGING_STUB_NAME;
  private readonly logger = new Logger("STUB SMS");

  async send(toE164: string, body: string): Promise<ProviderResult> {
    const fault = await injectStubFault(getStubFaultMode("SMS"), "SMS_STUB_FAIL");
    if (fault !== null) {
      return fault;
    }

    const providerMessageId = `stub-sms-${Date.now().toString(36)}`;
    this.logger.warn(`NOT SENT (logging stub) — would text ${maskPhone(toE164)}: "${body}" [${providerMessageId}]`);
    return { accepted: true, providerMessageId };
  }
}
