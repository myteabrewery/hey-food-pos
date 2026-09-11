import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { ResolvedMenuItem } from "@hey-food/shared-types";
import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import { QuantityStepper } from "./QuantityStepper";

type ModifierGroup = ResolvedMenuItem["modifierGroups"][number];
type ModifierOption = ModifierGroup["options"][number];

// Photo-grid card checkmark badge — sized as a small corner accent, not a
// tap target itself (the card's own "+ Add"/stepper control below is what's
// interactive), so it isn't measured against MIN_TAP_TARGET_PX.
const CHECK_BADGE_SIZE = 22;

export interface ModifierGroupSelectorProps {
  group: ModifierGroup;
  /** optionId -> selected quantity. An option not present (or present at 0) is unselected. */
  selectedQuantities: Record<string, number>;
  /** Called with the option's new quantity — 0 means "deselect this option". */
  onChangeQuantity: (optionId: string, quantity: number) => void;
}

// Radio (single) vs. checkbox (multiple) indicator size — no mockup exists
// for this screen (docs/product-customization-v1.md, "never built"), so
// this is sized against MIN_TAP_TARGET_PX-independent judgment: small
// enough to read as an inline indicator, not a primary tap target itself
// (the whole option row is what's pressable).
const INDICATOR_SIZE = 20;

/**
 * Describes a group's min/max constraint as UI copy, per
 * docs/product-customization-v2.md — no wording is spec'd, this is a
 * judgment call. `selectedCount` (distinct options selected, not summed
 * quantity — matches the backend's own counting rule) is folded into the
 * text wherever a live count adds real information; the exactly-one case
 * ("Required") stays static since a filled radio already makes that
 * status obvious without a number.
 */
function describeSelectionStatus(
  selectedCount: number,
  minSelections: number,
  maxSelections: number | null,
): string | null {
  const unconstrained = minSelections === 0 && maxSelections === null;
  if (unconstrained) {
    return null;
  }

  if (minSelections === maxSelections) {
    return minSelections === 1 ? "Required" : `Select exactly ${minSelections} (${selectedCount} selected)`;
  }

  if (minSelections === 0) {
    // Optional, capped — e.g. Carb Base (min 0, max 1).
    return `${selectedCount} of up to ${maxSelections} selected`;
  }

  if (maxSelections === null) {
    // Required minimum, no upper bound — e.g. Ingredients (min 2, no max).
    return `${selectedCount} of at least ${minSelections} selected`;
  }

  // Required minimum AND a distinct upper bound.
  return `${selectedCount} selected (choose ${minSelections}–${maxSelections})`;
}

/**
 * Renders one ProductModifierGroup as radio buttons ("single"),
 * checkboxes ("multiple"), or — for any option with `quantityEnabled` —
 * a `QuantityStepper` instead of a plain toggle, per
 * docs/product-customization-v2.md. Selection exclusivity for "single"
 * groups is enforced by the caller's `onChangeQuantity` handler, not
 * here — this component only renders the current `selectedQuantities`,
 * the group's own min/max status, and reports quantity changes.
 *
 * "Required"/status-text color: no dedicated token/guidance exists for
 * this in the design system (checked hey-food-design-system-v1.md and
 * both customer-app-screens docs) — `yellow` is documented as reserved
 * for a single highest-emphasis CTA per screen, which this isn't, so
 * `teal` (the general accent/action color) is reused instead, and only
 * once the group's minSelections is actually satisfied (muted grey
 * until then) — a lightweight affirmation without inventing a new
 * error/success color pair. Flagged as a judgment call, not spec-confirmed.
 *
 * A "multiple" group's unselected options are disabled once
 * `maxSelections` is reached (already-selected ones stay tappable, to
 * allow deselecting) — no current seed data actually has a capped
 * "multiple" group (Ingredients/Add-ons/Remove are all `maxSelections:
 * null`), so this path is implemented per spec but couldn't be exercised
 * on-device this pass.
 *
 * A "multiple" group whose options are `quantityEnabled` (i.e.
 * Ingredients) renders as a 2-column photo grid instead of the plain
 * list above — single-select groups (Soup Base, Carb Base) and any
 * non-quantity "multiple" group (Add-ons, Remove) are unaffected, since
 * a grid doesn't add anything for "pick exactly one from three" or plain
 * checkboxes. Judgment calls in the grid, flagged:
 * - Missing `imageUrl` falls back to the option name's first letter on a
 *   `peach` tile (documented in design-tokens as the placeholder-photo
 *   color) rather than a generic icon — gives each card a distinct
 *   visual anchor even with zero real photos, which is the case for
 *   every option in the current seed data.
 * - Only the card's own "+ Add" button / stepper is tappable, not the
 *   whole card — with a photo filling most of the card, a whole-card tap
 *   target risks accidental adds/removes while browsing photos.
 */
export function ModifierGroupSelector({ group, selectedQuantities, onChangeQuantity }: ModifierGroupSelectorProps) {
  const isRadio = group.selectionType === "single";
  const selectedCount = group.options.filter((option) => (selectedQuantities[option.id] ?? 0) > 0).length;
  // selectedCount > 0 is required here, not just >= minSelections: for an
  // optional group (minSelections: 0, e.g. Carb Base) that inequality is
  // trivially true at zero selections, which would show the teal
  // "satisfied" treatment before the customer has actually picked
  // anything — indistinguishable from a genuinely completed required
  // group. Requiring a real selection keeps "satisfied" meaning "you did
  // something", not "there was nothing to do".
  const isSatisfied = selectedCount > 0 && selectedCount >= group.minSelections;
  const statusText = describeSelectionStatus(selectedCount, group.minSelections, group.maxSelections);
  const atMax = group.maxSelections !== null && selectedCount >= group.maxSelections;
  const usesPhotoGrid = group.selectionType === "multiple" && group.options.some((option) => option.quantityEnabled);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.groupName}>{group.name}</Text>
        {statusText && (
          <Text style={[styles.statusText, isSatisfied && styles.statusTextSatisfied]}>{statusText}</Text>
        )}
      </View>

      {usesPhotoGrid ? (
        <View style={styles.grid}>
          {pairOptions(group.options).map((pair, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.gridRow}>
              {pair.map((option) => (
                <IngredientCard
                  key={option.id}
                  option={option}
                  quantity={selectedQuantities[option.id] ?? 0}
                  disabled={!((selectedQuantities[option.id] ?? 0) > 0) && atMax}
                  onChangeQuantity={(next) => onChangeQuantity(option.id, next)}
                />
              ))}
              {/* An odd last row's lone card would otherwise stretch to
                  fill the full row width via its own flex: 1 — this
                  invisible spacer keeps it the same half-width as every
                  other card instead. */}
              {pair.length === 1 && <View style={styles.gridSpacer} />}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.options}>
          {group.options.map((option) => {
            const quantity = selectedQuantities[option.id] ?? 0;
            const isSelected = quantity > 0;

            if (option.quantityEnabled) {
              return (
                <View key={option.id} style={styles.quantityOptionRow}>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionName}>{option.name}</Text>
                    <Text style={styles.optionPriceDelta}>
                      {option.priceDelta > 0 ? `+RM${option.priceDelta.toFixed(2)} each` : "Free"}
                    </Text>
                  </View>
                  <QuantityStepper
                    quantity={quantity}
                    min={0}
                    onChange={(next) => onChangeQuantity(option.id, next)}
                  />
                </View>
              );
            }

            // Once a "multiple" group hits its cap, unselected options
            // become inert — already-selected ones stay tappable so the
            // customer can still deselect.
            const isDisabled = !isSelected && !isRadio && atMax;

            return (
              <Pressable
                key={option.id}
                style={[styles.optionRow, isDisabled && styles.optionRowDisabled]}
                onPress={() => onChangeQuantity(option.id, isSelected ? 0 : 1)}
                disabled={isDisabled}
                accessibilityRole={isRadio ? "radio" : "checkbox"}
                accessibilityState={{ checked: isSelected, disabled: isDisabled }}
                accessibilityLabel={option.name}
              >
                <View
                  style={[
                    styles.indicator,
                    isRadio ? styles.indicatorRadio : styles.indicatorCheckbox,
                    isSelected && styles.indicatorSelected,
                  ]}
                >
                  {isSelected && (
                    <View style={isRadio ? styles.radioDot : styles.checkboxMark} />
                  )}
                </View>
                <Text style={styles.optionName}>{option.name}</Text>
                <Text style={styles.optionPriceDelta}>
                  {option.priceDelta > 0 ? `+RM${option.priceDelta.toFixed(2)}` : "Free"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function pairOptions(options: ModifierOption[]): ModifierOption[][] {
  const pairs: ModifierOption[][] = [];
  for (let i = 0; i < options.length; i += 2) {
    pairs.push(options.slice(i, i + 2));
  }
  return pairs;
}

interface IngredientCardProps {
  option: ModifierOption;
  quantity: number;
  disabled: boolean;
  onChangeQuantity: (quantity: number) => void;
}

function IngredientCard({ option, quantity, disabled, onChangeQuantity }: IngredientCardProps) {
  const isSelected = quantity > 0;

  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>
      <View style={styles.cardPhoto}>
        {option.imageUrl ? (
          <Image source={{ uri: option.imageUrl }} style={styles.cardPhotoImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardPhotoFallback}>
            <Text style={styles.cardPhotoFallbackLetter}>{option.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {isSelected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={14} color={BRAND_COLORS.white} />
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardOptionName} numberOfLines={1}>
          {option.name}
        </Text>
        <Text style={styles.optionPriceDelta}>
          {option.priceDelta > 0 ? `+RM${option.priceDelta.toFixed(2)} each` : "Free"}
        </Text>
      </View>

      {isSelected ? (
        <View style={styles.cardStepperRow}>
          <QuantityStepper quantity={quantity} min={0} onChange={onChangeQuantity} />
        </View>
      ) : (
        <Pressable
          style={[styles.addButton, disabled && styles.addButtonDisabled]}
          onPress={() => onChangeQuantity(1)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          accessibilityLabel={`Add ${option.name}`}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING_SCALE[2], // 12px
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING_SCALE[1], // 8px
  },
  groupName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  statusText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "600",
    color: BRAND_COLORS.muted,
  },
  statusTextSatisfied: {
    color: BRAND_COLORS.teal,
  },
  options: {
    gap: SPACING_SCALE[2], // 12px
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING_SCALE[2], // 12px
  },
  optionRowDisabled: {
    opacity: 0.4,
  },
  quantityOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING_SCALE[2], // 12px
  },
  optionInfo: {
    flex: 1,
    gap: SPACING_SCALE[0], // 4px
  },
  indicator: {
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderWidth: 2,
    borderColor: BRAND_COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorRadio: {
    borderRadius: RADIUS.pill,
  },
  indicatorCheckbox: {
    borderRadius: RADIUS.sm / 2,
  },
  indicatorSelected: {
    borderColor: BRAND_COLORS.teal,
  },
  radioDot: {
    width: INDICATOR_SIZE / 2,
    height: INDICATOR_SIZE / 2,
    borderRadius: RADIUS.pill,
    backgroundColor: BRAND_COLORS.teal,
  },
  checkboxMark: {
    width: INDICATOR_SIZE - 8,
    height: INDICATOR_SIZE - 8,
    borderRadius: RADIUS.sm / 2,
    backgroundColor: BRAND_COLORS.teal,
  },
  optionName: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.ink,
  },
  optionPriceDelta: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "600",
    color: BRAND_COLORS.muted,
  },
  grid: {
    gap: SPACING_SCALE[2], // 12px
  },
  gridRow: {
    flexDirection: "row",
    gap: SPACING_SCALE[2], // 12px
  },
  gridSpacer: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderWidth: 2,
    borderColor: BRAND_COLORS.line,
    borderRadius: RADIUS.md,
    backgroundColor: BRAND_COLORS.white,
    overflow: "hidden",
  },
  cardSelected: {
    borderColor: BRAND_COLORS.teal,
  },
  cardPhoto: {
    width: "100%",
    aspectRatio: 1,
  },
  cardPhotoImage: {
    width: "100%",
    height: "100%",
  },
  cardPhotoFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: BRAND_COLORS.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  cardPhotoFallbackLetter: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.heading.customer,
    fontWeight: "700",
    color: BRAND_COLORS.white,
  },
  checkBadge: {
    position: "absolute",
    top: SPACING_SCALE[1], // 8px
    right: SPACING_SCALE[1], // 8px
    width: CHECK_BADGE_SIZE,
    height: CHECK_BADGE_SIZE,
    borderRadius: RADIUS.pill,
    backgroundColor: BRAND_COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    padding: SPACING_SCALE[2], // 12px
    paddingBottom: SPACING_SCALE[1], // 8px
    gap: SPACING_SCALE[0], // 4px
  },
  cardOptionName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.ink,
  },
  cardStepperRow: {
    alignItems: "center",
    marginHorizontal: SPACING_SCALE[2], // 12px
    marginBottom: SPACING_SCALE[2], // 12px
  },
  addButton: {
    marginHorizontal: SPACING_SCALE[2], // 12px
    marginBottom: SPACING_SCALE[2], // 12px
    minHeight: MIN_TAP_TARGET_PX.customer,
    borderRadius: RADIUS.sm,
    backgroundColor: BRAND_COLORS.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "700",
    color: BRAND_COLORS.white,
  },
});
