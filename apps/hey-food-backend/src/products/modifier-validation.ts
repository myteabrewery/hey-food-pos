import { HttpStatus } from "@nestjs/common";

import { ApiException } from "../common/api-exception";

export interface ProductModifierOptionForValidation {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ProductModifierGroupForValidation {
  id: string;
  name: string;
  selectionType: "single" | "multiple";
  required: boolean;
  options: ProductModifierOptionForValidation[];
}

export interface ProductForModifierValidation {
  id: string;
  modifierGroups: ProductModifierGroupForValidation[];
}

export interface ValidatedModifierSelection {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface ValidatedModifiers {
  selections: ValidatedModifierSelection[];
  totalPriceDelta: number;
}

/**
 * Validates a customer's selected modifier option IDs against a product's
 * actual modifier groups/options, per docs/product-customization-v1.md's
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
 * A "single" group is mutually exclusive regardless of `required`: at
 * most one option may ever be selected from it. `required` only governs
 * the *lower* bound — a required single-select group must have exactly
 * one selection, a non-required one may have zero or one, but never more
 * than one either way. (This was genuinely ambiguous in an earlier draft
 * of the spec — docs/product-customization-v1.md's validation-rules
 * section now states it explicitly.)
 */
export function validateSelectedModifiers(
  product: ProductForModifierValidation,
  selectedOptionIds: string[],
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

  // Rule: every selected ID must belong to one of this product's own
  // modifier groups — rejects cross-product option IDs outright.
  const selections: ValidatedModifierSelection[] = selectedOptionIds.map((optionId) => {
    const match = optionById.get(optionId);
    if (!match) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_MODIFIER_OPTION",
        `Modifier option "${optionId}" does not belong to product "${product.id}".`,
      );
    }
    return {
      groupId: match.group.id,
      groupName: match.group.name,
      optionId: match.option.id,
      optionName: match.option.name,
      priceDelta: match.option.priceDelta,
    };
  });

  const selectedOptionIdSet = new Set(selectedOptionIds);

  // Rule: a "single" group is mutually exclusive regardless of
  // `required` — more than one selection is always rejected. `required`
  // only sets the lower bound: exactly one for a required group, zero or
  // one for a non-required one. Multiple-select groups have no minimum
  // or maximum — nothing to check for those beyond the cross-product
  // rule above.
  for (const group of product.modifierGroups) {
    if (group.selectionType !== "single") {
      continue;
    }
    const selectedCount = group.options.filter((option) => selectedOptionIdSet.has(option.id)).length;

    if (selectedCount > 1) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "TOO_MANY_MODIFIER_SELECTIONS",
        `At most one option from single-select group "${group.name}" may be selected (got ${selectedCount}).`,
      );
    }

    if (group.required && selectedCount === 0) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "MISSING_REQUIRED_MODIFIER",
        `Exactly one option from required group "${group.name}" must be selected (got ${selectedCount}).`,
      );
    }
  }

  const totalPriceDelta = selections.reduce((sum, selection) => sum + selection.priceDelta, 0);

  return { selections, totalPriceDelta };
}
