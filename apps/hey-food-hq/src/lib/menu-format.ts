import type { MenuChangeEvent } from "@hey-food/api-client";

const FIELD_LABELS: Record<string, string> = {
  created: "Product created",
  name: "Name",
  description: "Description",
  image_url: "Image URL",
  category: "Category",
  master_price: "Master price",
  is_available: "Availability",
  price_override: "Price override",
};

/** A stored change value ("8.50", "true", null) as a person would read it. */
function formatValue(field: string, value: string | null): string {
  if (value === null) return field === "price_override" ? "none (master price)" : "(empty)";
  if (field === "master_price" || field === "price_override") return `RM${value}`;
  if (field === "is_available") return value === "true" ? "available" : "sold out";
  return value === "" ? "(empty)" : value;
}

/** One change-log entry as display text: what changed, where, and from what to what. */
export function describeChange(change: MenuChangeEvent): { what: string; detail: string } {
  const what = FIELD_LABELS[change.field] ?? change.field;
  const where = change.outletName ? ` at ${change.outletName}` : "";
  if (change.field === "created") {
    return { what, detail: `"${change.newValue ?? ""}"` };
  }
  return { what: `${what}${where}`, detail: `${formatValue(change.field, change.oldValue)} → ${formatValue(change.field, change.newValue)}` };
}

/** Kuala Lumpur time, deterministic on the server. */
export function formatChangeTime(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(iso));
}
