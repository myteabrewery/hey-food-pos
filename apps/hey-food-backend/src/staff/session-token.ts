import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * A staff session's bearer token: 32 random bytes (256 bits), base64url. Only
 * its SHA-256 hash is stored (StaffSession.tokenHash) — the raw token exists
 * in the login response and wherever the POS app keeps it (SecureStore),
 * nowhere else.
 *
 * A fast hash is right here, exactly as for the guest order token
 * (src/orders/guest-token.ts, which this mirrors): this is 256 bits of
 * randomness, not a low-entropy secret like a PIN, so it cannot be
 * brute-forced at any hash speed — unlike StaffUser.pinHash, which
 * deliberately uses the slow, salted scrypt (src/staff/pin-hash.ts).
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of a presented token's hash against a stored one. */
export function sessionTokenHashMatches(presentedToken: string, storedHash: string): boolean {
  const presented = Buffer.from(hashSessionToken(presentedToken), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return presented.length === stored.length && timingSafeEqual(presented, stored);
}
