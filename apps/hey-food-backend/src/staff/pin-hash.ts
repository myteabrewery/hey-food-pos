import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * PIN hashing (StaffUser.pinHash). A PIN is 6 DIGITS — low entropy (10^6
 * possibilities) — unlike the guest order token (32 random bytes, hashed with
 * plain SHA-256 in src/orders/guest-token.ts): a fast hash is wrong here
 * precisely because a PIN is guessable, so this uses scrypt, a deliberately
 * slow, salted KDF.
 *
 * Not bcrypt/argon2: both ship as native addons, and this repo already hit a
 * native-binding wall once — Prisma's own query engine has no Windows-ARM64
 * build (backend README "Windows on ARM"). `crypto.scrypt` is pure Node core
 * with no native binding, so it can't fail the same way. Its cost defaults
 * (N=16384, r=8, p=1) are Node's own and are not tuned further here.
 *
 * Nothing calls `verifyPin` in a real login path yet: POS still checks the
 * separate POS_DEVICE_KEY stopgap. `verifyPin` exists today only for the PIN-
 * uniqueness check on create/reset (see admin-staff.service.ts) — comparing a
 * new PIN against every existing hash in the business, one scrypt call per
 * staff member. That is O(n) in staff count, fine for a small business, and
 * would need revisiting (e.g. a per-outlet subset, or accepting collisions
 * across outlets that can never share a device) well before it doesn't scale.
 */
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** `pin` -> `"<salt-hex>:<hash-hex>"`, ready to store as `pinHash`. */
export function hashPin(pin: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(pin, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/** Constant-time compare of a candidate PIN against a stored `"salt:hash"`. */
export function verifyPin(pin: string, stored: string): boolean {
  const separator = stored.indexOf(":");
  if (separator < 0) return false;
  const saltHex = stored.slice(0, separator);
  const hashHex = stored.slice(separator + 1);
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
