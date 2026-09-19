import type { OrderItemModifier } from "@hey-food/shared-types";

// Fixed clock-time format ("10:32 AM"), not a live "N min ago" countdown —
// docs/hey-food-developer-spec-v1.md's Order Card spec just says
// "Timestamp" without specifying which, and a static clock time avoids
// needing an interval timer to keep relative time fresh across a screen's
// whole lifetime. Judgment call, flagged. Shared by the queue card and the
// order detail screen so the two can never format the same time differently.
export function formatClockTime(iso: string): string {
  const date = new Date(iso);
  const hours24 = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}

// "Item count" reads as total quantity across all line items (e.g. "1x
// Chicken Rice + 2x Iced Tea" = 3), not the number of distinct line items
// (which would be 2) — a kitchen cares how much food to make, not how
// many rows are on the receipt. Judgment call, flagged.
export function totalItemCount(order: { items: ReadonlyArray<{ quantity: number }> }): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export interface ModifierGroupSummary {
  groupName: string;
  options: Array<{ id: string; name: string; quantity: number }>;
}

/**
 * Groups an order item's flat modifier snapshots by their group name
 * ("Soup Base", "Ingredients", "Carb Base") for display, so staff read one
 * labelled block per choice instead of a run-on list. Groups and the
 * options inside them keep first-appearance order — the server writes
 * modifiers in group/option sort order, and re-sorting here would only
 * risk disagreeing with what the customer saw while ordering.
 *
 * `quantity` is passed through untouched: for a plain on/off option it's
 * always 1 (OrderItemModifier's documented default), for a
 * quantity-enabled one ("2x Fish Balls") it's the real count.
 */
export function groupModifiers(modifiers: ReadonlyArray<OrderItemModifier>): ModifierGroupSummary[] {
  const groups: ModifierGroupSummary[] = [];
  const byName = new Map<string, ModifierGroupSummary>();

  for (const modifier of modifiers) {
    let group = byName.get(modifier.groupNameSnapshot);
    if (!group) {
      group = { groupName: modifier.groupNameSnapshot, options: [] };
      byName.set(modifier.groupNameSnapshot, group);
      groups.push(group);
    }
    group.options.push({
      id: modifier.id,
      name: modifier.optionNameSnapshot,
      quantity: modifier.quantity,
    });
  }

  return groups;
}
