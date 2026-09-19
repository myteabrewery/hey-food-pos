/**
 * Client-side selection rules for a product's modifier groups —
 * docs/product-customization-v2.md. Pure functions over plain data, no
 * React/React Native/DOM, so any frontend can share them.
 *
 * DISPLAY/UX ONLY. These decide whether to enable "Add to cart" and which
 * options to grey out. The authority is always the backend's
 * `validateSelectedModifiers` (apps/hey-food-backend/src/products/
 * modifier-validation.ts), which re-validates every order regardless of
 * what a client claims — same "never trust the client" rule as pricing.
 * These functions are written to agree with it on the min/max bounds, and
 * that agreement is what to re-check if either side is ever changed.
 *
 * Extracted for the guest web checkout (apps/hey-food-web). The Customer
 * App still carries its own inline copies of this logic
 * (ModifierGroupSelector.tsx, ProductDetailScreen.tsx) — deliberately left
 * untouched; see docs/STATUS.md for the tracked, optional cleanup.
 *
 * A selection is a map of `optionId -> quantity`, where an absent key or
 * a quantity of 0 both mean "not selected" — the shape both frontends
 * already keep in state.
 */

/** The structural subset of `ProductModifierGroup` (+ its options) the rules need. */
export interface ModifierRuleGroup {
  selectionType: "single" | "multiple";
  minSelections: number;
  maxSelections: number | null;
  options: ReadonlyArray<{ id: string }>;
}

export type SelectedQuantities = Readonly<Record<string, number>>;

/**
 * How many DISTINCT options are selected in a group. This — not summed
 * quantity — is what `minSelections`/`maxSelections` bound: "2x Fish
 * Balls" counts as one selection.
 */
export function countSelected(group: ModifierRuleGroup, selected: SelectedQuantities): number {
  return group.options.filter((option) => (selected[option.id] ?? 0) > 0).length;
}

/**
 * True when the group's current selection is acceptable to the backend:
 * `minSelections <= count <= maxSelections` (no upper bound if null).
 *
 * Note this is the validity rule, so an optional group (min 0) is
 * "satisfied" with nothing selected. That's intentionally different from
 * the Customer App's teal "satisfied" status styling, which additionally
 * requires count > 0 as a purely visual affirmation.
 */
export function isGroupSatisfied(group: ModifierRuleGroup, selected: SelectedQuantities): boolean {
  const count = countSelected(group, selected);
  return count >= group.minSelections && (group.maxSelections === null || count <= group.maxSelections);
}

/** True once the group's selection cap is reached (never, when uncapped). */
export function isAtMax(group: ModifierRuleGroup, selected: SelectedQuantities): boolean {
  return group.maxSelections !== null && countSelected(group, selected) >= group.maxSelections;
}

/** Every group satisfied — i.e. the item is ready to add to the cart. */
export function areAllGroupsSatisfied(
  groups: ReadonlyArray<ModifierRuleGroup>,
  selected: SelectedQuantities,
): boolean {
  return groups.every((group) => isGroupSatisfied(group, selected));
}

/**
 * Returns the next selection after setting one option's quantity.
 * Never mutates its input. A quantity of 0 (or less) deselects. Picking
 * something in a `single` group first clears its siblings (radio
 * exclusivity). Doesn't enforce the cap — callers grey out unselected
 * options via `isAtMax` before they can be tapped, as the app does.
 */
export function setOptionQuantity(
  group: ModifierRuleGroup,
  selected: SelectedQuantities,
  optionId: string,
  nextQuantity: number,
): Record<string, number> {
  const next: Record<string, number> = { ...selected };

  if (group.selectionType === "single" && nextQuantity > 0) {
    for (const option of group.options) {
      delete next[option.id];
    }
  }

  if (nextQuantity > 0) {
    next[optionId] = nextQuantity;
  } else {
    delete next[optionId];
  }

  return next;
}
