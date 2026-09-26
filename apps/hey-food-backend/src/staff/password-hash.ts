import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing (StaffUser.passwordHash) — real HQ web login, not a PIN.
 * Same `crypto.scrypt` primitive as pin-hash.ts, for the same reason: it's
 * pure Node core with no native addon, and this repo already hit a
 * native-binding wall once (Prisma's own query engine has no Windows-ARM64
 * build). A real password (StaffPasswordSchema: 10+ characters, no
 * composition rules) doesn't need scrypt's slowness as urgently as a
 * 6-digit PIN does — but there's no reason to introduce a second KDF for a
 * credential at this stakes level either, so the shape here is deliberately
 * identical to pin-hash.ts's, just under its own name for what it is.
 *
 * Unlike PIN, a password is never checked for uniqueness across a business:
 * HQ login looks a staff member up by `phone` directly (unique per business
 * already), then verifies the password against THAT one row — an O(1) check,
 * not PIN login's O(n)-in-staff-count scan, because nothing here needs the
 * secret itself to double as a lookup key.
 */
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** `password` -> `"<salt-hex>:<hash-hex>"`, ready to store as `passwordHash`. */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/** Constant-time compare of a candidate password against a stored `"salt:hash"`. */
export function verifyPassword(password: string, stored: string): boolean {
  const separator = stored.indexOf(":");
  if (separator < 0) return false;
  const saltHex = stored.slice(0, separator);
  const hashHex = stored.slice(separator + 1);
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
