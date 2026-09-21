import { OrderStatus } from "@hey-food/design-tokens";

/** Kuala Lumpur time, deterministic on the server. */
export function formatOrderTime(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(iso));
}

/** Just the clock part, for a timeline whose date is already known. */
export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", { timeStyle: "medium", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(iso));
}

/** Today's business date in Kuala Lumpur, "YYYY-MM-DD" (the day the POS's order numbers reset on). */
export function kualaLumpurToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "YYYY-MM-DD" shifted by whole days (pure calendar arithmetic; no timezone involved). */
export function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** The reasons the cancel dropdown offers (dev spec Section 5.2's fixed list, the same one the POS uses). */
export const CANCEL_REASONS = [
  { value: "item_unavailable", label: "Item unavailable" },
  { value: "customer_no_show", label: "Customer didn't show up" },
  { value: "kitchen_error", label: "Kitchen error" },
  { value: "other", label: "Other (describe below)" },
] as const;

export function cancelReasonLabel(reason: string | null): string {
  return CANCEL_REASONS.find((option) => option.value === reason)?.label.replace(" (describe below)", "") ?? reason ?? "—";
}

export const CANCEL_SOURCE_LABEL = { hq: "from HQ", pos: "at the outlet's POS" } as const;

/** The Status filter's choices. `""` is the default view (everything except pending). */
export const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All except pending (default)" },
  { value: "all", label: "Everything, including pending" },
  { value: OrderStatus.Pending, label: "Pending (unpaid)" },
  { value: OrderStatus.Paid, label: "Paid, not yet received" },
  { value: OrderStatus.Received, label: "Received" },
  { value: OrderStatus.Preparing, label: "Preparing" },
  { value: OrderStatus.Ready, label: "Ready" },
  { value: OrderStatus.Completed, label: "Completed" },
  { value: OrderStatus.Cancelled, label: "Cancelled" },
];

/** The filter value the backend's `status` param takes, or undefined for its default view. */
export function statusParam(choice: string | undefined): string | undefined {
  if (!choice) return undefined;
  if (choice === "all") return Object.values(OrderStatus).join(",");
  return choice;
}
