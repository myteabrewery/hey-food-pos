import { z } from "zod";

/**
 * Normalizes a Malaysian mobile number to E.164 (`+60…`), or returns null
 * if it isn't one. Guest checkout's phone number is the ONLY identity on
 * the order and the only channel for the "ready" SMS, so a mistyped number
 * means the customer never hears their food is ready — hence rejecting
 * anything we can't confidently normalize rather than passing junk through.
 *
 * Accepts the ways people actually type it: `012-345 6789`, `0123456789`,
 * `60123456789`, `+60 12-345 6789`, `(012) 3456789`. Malaysia-only on
 * purpose (Billplz + a Malaysia-focused SMS aggregator, dev spec
 * Sections 6/8) and mobile-only: `1` must follow the country code, which
 * rules out landlines that could never receive the SMS. A national
 * number is `1x` + 7 digits, or `11` + 8 digits (`011-xxxx xxxx`), i.e.
 * 9–10 digits after `+60`.
 *
 * Pure and dependency-free so the web checkout can validate inline (UX)
 * and the backend can re-run the identical function authoritatively —
 * same "client display is never the source of truth" split as the
 * modifier rules.
 */
export function normalizeMalaysianMobile(raw: string): string | null {
  const trimmed = raw.trim();
  // Only digits plus the usual human separators; reject letters/other
  // symbols outright instead of silently stripping them.
  if (!/^\+?[\d\s\-()]+$/.test(trimmed)) return null;

  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  let national: string;
  if (hadPlus) {
    if (!digits.startsWith("60")) return null;
    national = digits.slice(2);
  } else if (digits.startsWith("60")) {
    national = digits.slice(2);
  } else if (digits.startsWith("0")) {
    national = digits.slice(1);
  } else {
    return null;
  }

  return /^1\d{8,9}$/.test(national) ? `+60${national}` : null;
}

/**
 * Zod form of the above. Input is whatever the customer typed; the parsed
 * output is always canonical E.164, so a server that parses with this
 * schema never sees a raw variant.
 */
export const GuestPhoneSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeMalaysianMobile(value);
  if (normalized === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid Malaysian mobile number, e.g. 012-345 6789.",
    });
    return z.NEVER;
  }
  return normalized;
});
