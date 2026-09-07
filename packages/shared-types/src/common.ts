/**
 * ISO 8601 timestamp string (e.g. "2026-09-07T14:32:00.000Z").
 *
 * Every `_at` timestamp field across the shared entity types uses this,
 * not `Date` — these types cross the wire as JSON between the backend and
 * three different client runtimes, and `Date` doesn't survive that trip.
 */
export type ISODateString = string;
