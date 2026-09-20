import { Logger } from "@nestjs/common";

// Environment-driven switches. Two of them are TEMPORARY STAND-INS that must
// not exist in a production deployment — see the "Pre-launch checklist" in
// README.md. Read lazily (functions, not module-level constants) so a value
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
 * TEMPORARY STAND-IN for real POS staff/device auth (dev spec Section 5.5:
 * PIN login, device bound to its outlet — not built). A single shared secret
 * the POS app sends as `X-Pos-Device-Key`. Null = not configured, and the
 * POS endpoints then refuse every request (fail closed).
 */
export function getPosDeviceKey(): string | null {
  const key = process.env.POS_DEVICE_KEY?.trim();
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
 * payment stub in production means free food, and the shared POS key is not
 * real authentication.
 */
export function assertNoTempStandInsInProduction(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const problems: string[] = [];
  if (isPaymentStubEnabled()) {
    problems.push("PAYMENT_STUB_ENABLED=true (orders would be marked paid without payment)");
  }
  if (getPosDeviceKey() !== null) {
    problems.push("POS_DEVICE_KEY is set (temporary shared-secret POS auth, not real staff/device auth)");
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
  if (getPosDeviceKey() !== null) {
    logger.warn(
      "[TEMP POS AUTH] POS_DEVICE_KEY is set — POS order endpoints are protected only by a shared secret, " +
        "not real staff/device auth. Must be replaced before launch.",
    );
  } else {
    logger.warn(
      "[TEMP POS AUTH] POS_DEVICE_KEY is not set — the POS order endpoints will refuse every request (503).",
    );
  }
}
