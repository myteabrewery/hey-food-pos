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
 * ############################################################################
 * TEMPORARY STAND-IN FOR REAL HQ AUTHENTICATION — AND THE MOST DANGEROUS ONE.
 * ############################################################################
 * A single shared secret the HQ Admin web app's SERVER sends as
 * `X-Hq-Admin-Key` to the /admin/* endpoints, which can change ANY master
 * price, ANY per-outlet price override and ANY availability for the whole
 * business, read every outlet's orders and cancel ANY order, and create/edit staff accounts (including setting their PIN).
 * Null = not configured, and /admin/* then refuses every request
 * (fail closed).
 *
 * It is NOT authentication: the HQ app itself has no login, so whoever can
 * reach the HQ app effectively holds this key's power. Its only protections are
 * that it lives in the HQ server's environment (never in a browser bundle) and
 * that the HQ app is only ever supposed to be reachable on localhost (see the
 * banner at the top of README.md and the CRITICAL section of docs/STATUS.md).
 */
export function getHqAdminKey(): string | null {
  const key = process.env.HQ_ADMIN_KEY?.trim();
  return key ? key : null;
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

  if (getHqAdminKey() !== null) {
    problems.push(
      "HQ_ADMIN_KEY is set (a shared-secret stand-in for HQ authentication, which does not exist: anyone who can use the HQ app can change any price and cancel any order)",
    );
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
  if (getHqAdminKey() !== null) {
    logger.warn(
      "[TEMP HQ AUTH] HQ_ADMIN_KEY is set — /admin/* (which can change ANY price for the whole business and cancel ANY order) is protected only by a shared secret, " +
        "and the HQ app has NO LOGIN. The HQ app must only ever be reachable on localhost. Real HQ auth must exist before launch.",
    );
  } else {
    logger.warn("[TEMP HQ AUTH] HQ_ADMIN_KEY is not set — the /admin/* endpoints will refuse every request (503).");
  }
}
