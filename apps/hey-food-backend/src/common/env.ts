import { Logger } from "@nestjs/common";

// Environment-driven switches. Several of them are TEMPORARY STAND-INS that
// must not exist in a production deployment — see the "Pre-launch checklist"
// in README.md. Read lazily (functions, not module-level constants) so a value
// set after import, e.g. by a test, is honoured.

/**
 * TEMPORARY STAND-IN. When true, POST /orders/:id/pay marks the order paid
 * immediately WITHOUT taking any payment (see payments/payment-stub.service.ts).
 * Real Billplz integration replaces this; until then it is the only way an
 * order becomes `paid`.
 */
export function isPaymentStubEnabled(): boolean {
  return process.env.PAYMENT_STUB_ENABLED === "true";
}

/**
 * TEMPORARY STAND-IN for a real push provider (FCM). When true, push
 * notifications go to a logging stub that SENDS NOTHING (see
 * notifications/logging-push.provider.ts). Off = no push provider at all, and
 * every push attempt is logged as failed ("no provider configured").
 */
export function isPushStubEnabled(): boolean {
  return process.env.PUSH_STUB_ENABLED === "true";
}

/**
 * TEMPORARY STAND-IN for a real SMS provider (none is chosen yet). When true,
 * SMS goes to a logging stub that SENDS NOTHING (see
 * notifications/logging-sms.provider.ts). Off = no SMS provider at all.
 */
export function isSmsStubEnabled(): boolean {
  return process.env.SMS_STUB_ENABLED === "true";
}

/**
 * DEV-ONLY fault injection for the logging stubs, so the failure paths can be
 * exercised for real without a real provider to break: `PUSH_STUB_FAIL` /
 * `SMS_STUB_FAIL` = `throw` (the provider throws, like an outage), `reject`
 * (it answers "not accepted"), `slow` (it takes 3 s, then accepts) or `hang`
 * (it never answers). Anything else means no fault. Only ever read by the
 * stubs, which a production process refuses to start with.
 */
export type StubFaultMode = "throw" | "reject" | "slow" | "hang" | "none";
export function getStubFaultMode(channel: "PUSH" | "SMS"): StubFaultMode {
  const value = process.env[`${channel}_STUB_FAIL`]?.trim();
  return value === "throw" || value === "reject" || value === "slow" || value === "hang" ? value : "none";
}

/** How long the notification service waits on one provider before giving up (default 10 s). */
export function getNotifyProviderTimeoutMs(): number {
  const parsed = Number(process.env.NOTIFY_PROVIDER_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10_000;
}

/**
 * The guest web checkout's origin: the ONE origin CORS allows, and where the
 * payment step sends the browser back to. No wildcard, ever.
 */
export function getWebOrigin(): string {
  return (process.env.WEB_ORIGIN?.trim() || "http://localhost:3002").replace(/\/+$/, "");
}

/**
 * Refuses to boot a production process that still has a temporary stand-in
 * switched on. This is deliberately a hard failure, not a warning: the
 * payment stub in production means free food, the shared POS key is not real
 * authentication, and the notification stubs mean customers are told nothing.
 */
export function assertNoTempStandInsInProduction(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const problems: string[] = [];
  if (isPaymentStubEnabled()) {
    problems.push("PAYMENT_STUB_ENABLED=true (orders would be marked paid without payment)");
  }
  if (isPushStubEnabled()) {
    problems.push("PUSH_STUB_ENABLED=true (push notifications would only be logged, never sent)");
  }
  if (isSmsStubEnabled()) {
    problems.push("SMS_STUB_ENABLED=true (SMS would only be logged, never sent — customers would not be told their food is ready)");
  }

  if (problems.length > 0) {
    throw new Error(
      `Refusing to start in production with temporary stand-ins enabled: ${problems.join("; ")}. ` +
        "See the Pre-launch checklist in apps/hey-food-backend/README.md.",
    );
  }
}

/** One loud line per active stand-in at startup, so they are never silent. */
export function logTempStandInWarnings(logger: Logger): void {
  if (isPaymentStubEnabled()) {
    logger.warn(
      "[STUB PAYMENT] PAYMENT_STUB_ENABLED=true — POST /orders/:id/pay marks orders PAID WITHOUT TAKING PAYMENT. " +
        "Temporary stand-in for Billplz; must be removed before launch.",
    );
  }
  logger.log("[POS AUTH] Real staff PIN login is in effect for POS endpoints (POS_DEVICE_KEY has been retired).");
  logger.log("[HQ AUTH] Real HQ web login is in effect for /admin/* endpoints (HQ_ADMIN_KEY has been retired).");
  if (isPushStubEnabled()) {
    logger.warn(
      "[STUB PUSH] PUSH_STUB_ENABLED=true — push notifications are only LOGGED, nothing is sent. " +
        "Temporary stand-in for FCM; must be replaced before launch.",
    );
  } else {
    logger.warn("[NOTIFY] PUSH_STUB_ENABLED is off and no real push provider exists — push attempts will be logged as FAILED.");
  }
  if (isSmsStubEnabled()) {
    logger.warn(
      "[STUB SMS] SMS_STUB_ENABLED=true — SMS is only LOGGED, nothing is sent. " +
        "Temporary stand-in for an SMS provider (none chosen yet); must be replaced before launch.",
    );
  } else {
    logger.warn("[NOTIFY] SMS_STUB_ENABLED is off and no real SMS provider exists — SMS attempts will be logged as FAILED.");
  }
}
