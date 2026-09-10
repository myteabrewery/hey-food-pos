import { HttpStatus } from "@nestjs/common";

import { ApiException } from "../common/api-exception";

export interface ProductModifierOptionForValidation {
  id: string;
  name: string;
  priceDelta: number;
  quantityEnabled: boolean;
}

export interface ProductModifierGroupForValidation {
  id: string;
  name: string;
  selectionType: "single" | "multiple";
  minSelections: number;
  maxSelections: number | null;
  options: ProductModifierOptionForValidation[];
}

export interface ProductForModifierValidation {
  id: string;
  modifierGroups: ProductModifierGroupForValidation[];
}

export interface SelectedModifierOptionInput {
  optionId: string;
  quantity: number;
}

export interface ValidatedModifierSelection {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
  quantity: number;
}

export interface ValidatedModifiers {
  selections: ValidatedModifierSelection[];
  totalPriceDelta: number;
}

/**
 * Validates a customer's selected modifier options against a product's
 * actual modifier groups/options, per docs/product-customization-v2.md's
 * order-creation validation rules. Throws `ApiException` (400) rather
 * than returning a result the caller has to remember to check — the
 * whole order is meant to be rejected outright on any failure ("fail
 * loudly, don't silently guess", same principle as the rest of this
 * API).
 *
 * Deliberately independent of Prisma/NestJS request plumbing: `product`
 * is a plain object shape, not a Prisma model, so this is callable
 * (and testable) without a live database. `POST /orders` (not built
 * yet — blocked on auth, per the agreed sequencing) will call this once
 * it exists; the rules themselves are verifiable now regardless.
 *
 * `minSelections`/`maxSelections` bound the count of DISTINCT options
 * selected in a group, not total quantity — "2x Fish Balls" is 1
 * selection toward that count. `quantity` is a separate, per-option
 * axis, only meaningful (> 1) when that option's `quantityEnabled` is
 * true. v2 supersedes v1's `required: boolean` entirely (see
 * docs/product-customization-v2.md's migration table for how old
 * values map onto these fields).
 */
export function validateSelectedModifiers(
  product: ProductForModifierValidation,
  selectedOptions: SelectedModifierOptionInput[],
): ValidatedModifiers {
  const optionById = new Map<
    string,
    { option: ProductModifierOptionForValidation; group: ProductModifierGroupForValidation }
  >();
  for (const group of product.modifierGroups) {
    for (const option of group.options) {
      optionById.set(option.id, { option, group });
    }
  }

  // Not one of the four rules the spec lists, but a real gap left open
  // otherwise: a duplicate optionId in the input wouldn't inflate a
  // group's distinct-selection count (the count below dedupes via a
  // Set), but WOULD double the same option's price contribution below,
  // silently over-charging. Rejecting outright rather than silently
  // deduping, per this API's "fail loudly" convention.
  const seenOptionIds = new Set<string>();
  for (const { optionId } of selectedOptions) {
    if (seenOptionIds.has(optionId)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "DUPLICATE_MODIFIER_OPTION",
        `Modifier option "${optionId}" was selected more than once.`,
      );
    }
    seenOptionIds.add(optionId);
  }

  // Rule: every selected ID must belong to one of this product's own
  // modifier groups — rejects cross-product option IDs outright.
  // Rule: quantity must be >= 1 for every selection.
  // Rule: quantity > 1 is rejected on any option where quantityEnabled
  // is false.
  const selections: ValidatedModifierSelection[] = selectedOptions.map(({ optionId, quantity }) => {
    const match = optionById.get(optionId);
    if (!match) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_MODIFIER_OPTION",
        `Modifier option "${optionId}" does not belong to product "${product.id}".`,
      );
    }

    if (quantity < 1) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_MODIFIER_QUANTITY",
        `Quantity for modifier option "${match.option.name}" must be at least 1 (got ${quantity}).`,
      );
    }

    if (quantity > 1 && !match.option.quantityEnabled) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "MODIFIER_QUANTITY_NOT_ALLOWED",
        `Modifier option "${match.option.name}" does not support a quantity greater than 1 (got ${quantity}).`,
      );
    }

    return {
      groupId: match.group.id,
      groupName: match.group.name,
      optionId: match.option.id,
      optionName: match.option.name,
      priceDelta: match.option.priceDelta,
      quantity,
    };
  });

  // Rule: the count of DISTINCT options selected per group must satisfy
  // minSelections <= count <= maxSelections (no upper bound if null).
  for (const group of product.modifierGroups) {
    const selectedCount = group.options.filter((option) => seenOptionIds.has(option.id)).length;

    if (selectedCount < group.minSelections) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "TOO_FEW_MODIFIER_SELECTIONS",
        `At least ${group.minSelections} option(s) from group "${group.name}" must be selected (got ${selectedCount}).`,
      );
    }

    if (group.maxSelections !== null && selectedCount > group.maxSelections) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "TOO_MANY_MODIFIER_SELECTIONS",
        `At most ${group.maxSelections} option(s) from group "${group.name}" may be selected (got ${selectedCount}).`,
      );
    }
  }

  // Rule: price is computed entirely server-side —
  // sum(option.priceDelta * selection.quantity). Client-side display
  // remains display-only, same rule as v1.
  const totalPriceDelta = selections.reduce(
    (sum, selection) => sum + selection.priceDelta * selection.quantity,
    0,
  );

  return { selections, totalPriceDelta };
}
