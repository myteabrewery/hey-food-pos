"use client";

import type { ResolvedMenuItem, SelectedQuantities } from "@hey-food/shared-types";
import { countSelected, isAtMax, isGroupSatisfied } from "@hey-food/shared-types";

import { formatRM } from "@/lib/format";

type Group = ResolvedMenuItem["modifierGroups"][number];

const MAX_OPTION_QUANTITY = 99;

/**
 * Human-readable bound for a group, from its min/max. Counts DISTINCT
 * options, not total quantity (docs/product-customization-v2.md) — "2x
 * Fish Balls" is still one selection.
 */
function describeBounds(min: number, max: number | null): string | null {
  if (min === 0 && max === null) return "Optional";
  if (max === null) return `Choose at least ${min}`;
  if (min === max) return `Choose ${min}`;
  if (min === 0) return `Optional, up to ${max}`;
  return `Choose ${min} to ${max}`;
}

interface Props {
  group: Group;
  selected: SelectedQuantities;
  onChangeQuantity: (optionId: string, nextQuantity: number) => void;
}

/**
 * One modifier group. Rule logic (counts, cap, satisfied) comes from
 * shared-types' modifier-rules — the same rules the backend enforces —
 * this component only renders it and reports quantity changes. The
 * parent owns the selection state and `setOptionQuantity` (radio
 * exclusivity lives there, not here).
 */
export function ModifierGroupPicker({ group, selected, onChangeQuantity }: Props) {
  const count = countSelected(group, selected);
  const satisfied = isGroupSatisfied(group, selected);
  const atMax = isAtMax(group, selected);
  const bounds = describeBounds(group.minSelections, group.maxSelections);
  const isRadio = group.selectionType === "single";
  // A group whose bounds aren't met is what's blocking "Add to cart", so
  // its label gets the accent treatment; a satisfied one goes muted.
  const blocking = !satisfied;
  const showCount = group.minSelections > 0 || group.maxSelections !== null;

  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2 flex w-full items-baseline justify-between gap-3">
        <span className="text-web-body font-semibold">{group.name}</span>
        {bounds && (
          <span className={`text-web-caption ${blocking ? "font-semibold text-brand-teal" : "text-brand-muted"}`}>
            {bounds}
            {showCount ? ` · ${count} selected` : ""}
          </span>
        )}
      </legend>

      <div
        role={isRadio ? "radiogroup" : "group"}
        aria-label={group.name}
        className="divide-y divide-brand-line overflow-hidden rounded-lg border border-brand-line bg-brand-white"
      >
        {group.options.map((option) => {
          const quantity = selected[option.id] ?? 0;
          const isSelected = quantity > 0;
          // In a multiple-select group, unselected options lock once the cap
          // is reached; selected ones stay tappable so the customer can
          // deselect. Never in a single-select (radio) group: its cap is 1
          // by definition, and picking another option is a switch —
          // setOptionQuantity clears the old pick — not an addition.
          const locked = !isRadio && !isSelected && atMax;
          const price =
            option.priceDelta > 0
              ? `+${formatRM(option.priceDelta)}${option.quantityEnabled ? " each" : ""}`
              : "Free";

          if (option.quantityEnabled) {
            return (
              <div
                key={option.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${locked ? "opacity-40" : ""}`}
              >
                <div className="min-w-0">
                  <p className="font-medium">{option.name}</p>
                  <p className="text-web-caption text-brand-muted">{price}</p>
                </div>
                {isSelected ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Remove one ${option.name}`}
                      onClick={() => onChangeQuantity(option.id, quantity - 1)}
                      className="min-h-tap min-w-tap rounded-pill border border-brand-teal text-web-heading leading-none text-brand-teal"
                    >
                      −
                    </button>
                    <span className="min-w-8 text-center font-semibold" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add one more ${option.name}`}
                      disabled={quantity >= MAX_OPTION_QUANTITY}
                      onClick={() => onChangeQuantity(option.id, quantity + 1)}
                      className="min-h-tap min-w-tap rounded-pill bg-brand-teal text-web-heading leading-none text-brand-white disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => onChangeQuantity(option.id, 1)}
                    className="min-h-tap shrink-0 rounded-pill border border-brand-teal px-4 font-semibold text-brand-teal disabled:cursor-not-allowed"
                  >
                    + Add
                  </button>
                )}
              </div>
            );
          }

          return (
            <button
              key={option.id}
              type="button"
              role={isRadio ? "radio" : "checkbox"}
              aria-checked={isSelected}
              disabled={locked}
              onClick={() => {
                if (isSelected) {
                  // Deselect: always fine for checkboxes; for a radio only
                  // when the group is optional (e.g. Carb Base) — a required
                  // radio can't be un-picked, only switched.
                  if (!isRadio || group.minSelections === 0) onChangeQuantity(option.id, 0);
                } else {
                  onChangeQuantity(option.id, 1);
                }
              }}
              className={`flex min-h-tap w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-40 ${
                isSelected ? "bg-brand-soft" : ""
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 ${
                    isRadio ? "rounded-pill" : "rounded-[4px]"
                  } ${isSelected ? "border-brand-teal bg-brand-teal" : "border-brand-muted"}`}
                >
                  {isSelected && <span className="h-2 w-2 rounded-pill bg-brand-white" />}
                </span>
                <span className="font-medium">{option.name}</span>
              </span>
              <span className="text-web-caption text-brand-muted">{price}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
