import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ResolvedMenuItem } from "@hey-food/shared-types";
import { BRAND_COLORS, FONT_FAMILY, RADIUS, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

type ModifierGroup = ResolvedMenuItem["modifierGroups"][number];

export interface ModifierGroupSelectorProps {
  group: ModifierGroup;
  selectedOptionIds: string[];
  onToggleOption: (optionId: string) => void;
}

// Radio (single) vs. checkbox (multiple) indicator size — no mockup exists
// for this screen (docs/product-customization-v1.md, "never built"), so
// this is sized against MIN_TAP_TARGET_PX-independent judgment: small
// enough to read as an inline indicator, not a primary tap target itself
// (the whole option row is what's pressable).
const INDICATOR_SIZE = 20;

/**
 * Renders one ProductModifierGroup as either radio buttons ("single") or
 * checkboxes ("multiple") per docs/product-customization-v1.md. Selection
 * exclusivity itself (a "single" group replacing its selection instead of
 * adding to it) is enforced by the caller's `onToggleOption` handler, not
 * here — this component only renders the current `selectedOptionIds` and
 * reports taps.
 *
 * "Required" indicator color: no dedicated token/guidance exists for this
 * in the design system (checked hey-food-design-system-v1.md and both
 * customer-app-screens docs) — `yellow` is documented as reserved for a
 * single highest-emphasis CTA per screen, which this isn't, so `teal`
 * (the general accent/action color) is reused instead. Flagged as a
 * judgment call, not a spec-confirmed choice.
 */
export function ModifierGroupSelector({ group, selectedOptionIds, onToggleOption }: ModifierGroupSelectorProps) {
  const isRadio = group.selectionType === "single";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.groupName}>{group.name}</Text>
        {/* TEMPORARY mechanical patch for docs/product-customization-v2.md's
            required -> minSelections/maxSelections change — see the same
            note in MenuItemRow.tsx. Also doesn't yet show maxSelections
            (e.g. "pick up to 2") or a minSelections > 1 case (e.g. "pick
            at least 2") distinctly from plain "Required"; Stage 3.5 rebuilds
            this label properly. */}
        {group.minSelections > 0 && <Text style={styles.requiredLabel}>Required</Text>}
      </View>

      <View style={styles.options}>
        {group.options.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id);

          return (
            <Pressable
              key={option.id}
              style={styles.optionRow}
              onPress={() => onToggleOption(option.id)}
              accessibilityRole={isRadio ? "radio" : "checkbox"}
              accessibilityState={{ checked: isSelected }}
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
    gap: SPACING_SCALE[1], // 8px
  },
  groupName: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
  requiredLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "600",
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
});
