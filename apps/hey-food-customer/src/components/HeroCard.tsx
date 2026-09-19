import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

export interface HeroCardProps {
  onPressExplore: () => void;
}

// Large decorative emoji at low opacity in the corner, per docs/customer-
// app-screens-v2.md Section 3.3 — not translatable copy, left as a
// constant rather than a translation key.
const DECORATIVE_EMOJI = "🍜";

// Component-specific one-off dimension, not tokenized — same convention as
// MenuItemRow's IMAGE_SIZE. The doc says "large... low opacity... in the
// corner" without an exact size.
const DECORATIVE_EMOJI_SIZE = 96;

/** docs/customer-app-screens-v2.md Section 3.3: navy hero marketing card. */
export function HeroCard({ onPressExplore }: HeroCardProps) {
  const { t } = useTranslation();
  const ctaLabel = t("heroCard.cta");

  return (
    <View style={styles.card}>
      <Text style={styles.decorativeEmoji}>{DECORATIVE_EMOJI}</Text>

      <Text style={styles.eyebrow}>{t("heroCard.eyebrow")}</Text>
      <Text style={styles.headline}>{t("heroCard.headline")}</Text>
      <Text style={styles.supportingCopy}>{t("heroCard.supportingCopy")}</Text>

      <Pressable
        style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
        onPress={onPressExplore}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        <Text style={styles.ctaButtonText}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

const customerSpacing = SPACING_BY_APP.customer;

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND_COLORS.navy,
    borderRadius: RADIUS.xl,
    padding: customerSpacing.cardPaddingPx,
    overflow: "hidden",
  },
  decorativeEmoji: {
    position: "absolute",
    right: 0,
    top: 0,
    fontSize: DECORATIVE_EMOJI_SIZE,
    opacity: 0.15,
  },
  eyebrow: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "700",
    color: BRAND_COLORS.yellow,
  },
  headline: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.display.customer,
    fontWeight: "700",
    // Tight leading relative to the 28px display size — a one-off value
    // for this element, not a token, same convention as IMAGE_SIZE.
    lineHeight: 30,
    color: BRAND_COLORS.white,
    marginTop: SPACING_SCALE[1], // 8px
  },
  supportingCopy: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "400",
    color: BRAND_COLORS.onNavyMuted,
    marginTop: SPACING_SCALE[1], // 8px
  },
  ctaButton: {
    backgroundColor: BRAND_COLORS.yellow,
    borderRadius: RADIUS.md,
    minHeight: MIN_TAP_TARGET_PX.customer,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: customerSpacing.cardPaddingPx,
    marginTop: customerSpacing.elementGapPx,
    alignSelf: "flex-start",
  },
  // Generic press-dim — no "yellowDark" token exists or was requested.
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaButtonText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "700",
    color: BRAND_COLORS.ink,
  },
});
