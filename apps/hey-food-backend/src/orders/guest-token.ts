import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * A guest's proof of ownership of one order: 32 random bytes (256 bits),
 * base64url. Only its SHA-256 hash is stored — the raw token exists in the
 * creation response and the guest's browser, nowhere else.
 *
 * A fast hash is right here (not bcrypt/argon2): those exist to slow
 * brute-forcing of LOW-entropy secrets like passwords, while this token is
 * 256 bits of randomness that cannot be brute-forced at any hash speed.
 */
export function generateGuestToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of a presented token against a stored hash. */
export function guestTokenMatches(presentedToken: string, storedHash: string | null): boolean {
  if (storedHash === null) {
    return false;
  }
  const presented = Buffer.from(hashGuestToken(presentedToken), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return presented.length === stored.length && timingSafeEqual(presented, stored);
}

/** The token from an `Authorization: Bearer <token>` header, or null. */
export function parseBearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "");
  return match?.[1] ?? null;
}
