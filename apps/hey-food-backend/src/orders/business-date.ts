/**
 * Display IDs reset "at midnight local time" (dev spec Section 3). Every
 * outlet is in Malaysia (Billplz, a Malaysia-only SMS aggregator), so one
 * fixed timezone is used rather than a per-outlet column — revisit if an
 * outlet ever opens outside it.
 */
export const BUSINESS_TIMEZONE = "Asia/Kuala_Lumpur";

/**
 * The outlet-local calendar day `at` falls on, as the UTC-midnight `Date`
 * that Prisma/Postgres expect for a `DATE` column (`en-CA` formats as
 * YYYY-MM-DD).
 */
export function businessDateFor(at: Date): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIMEZONE }).format(at);
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** "PM" + 7 -> "PM007". Past 999 the number simply grows ("PM1000"). */
export function formatDisplayId(prefix: string, sequence: number): string {
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}
