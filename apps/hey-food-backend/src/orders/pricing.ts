import { Prisma } from "@prisma/client";

/**
 * PLACEHOLDER — NOT A FINAL BUSINESS DECISION. The dev spec lists
 * `service_fee` on the order but never says how it is set; the Customer
 * App's mock uses a flat RM2.00, so that is used here until the real rule
 * (flat? percentage? per outlet?) is decided. Change it in one place: this
 * constant. Listed in the README's Pre-launch checklist.
 */
export const SERVICE_FEE_CENTS = 200;

/**
 * Money is computed in integer cents end to end (never floats), then written
 * to the DB's Decimal(10,2) columns. `Decimal.mul(100)` is exact, and every
 * stored amount has at most two decimal places, so `toNumber()` of the result
 * is an exact integer.
 */
export function toCents(amount: Prisma.Decimal): number {
  return amount.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}

export function centsToDecimal(cents: number): Prisma.Decimal {
  return new Prisma.Decimal(cents).div(100);
}
