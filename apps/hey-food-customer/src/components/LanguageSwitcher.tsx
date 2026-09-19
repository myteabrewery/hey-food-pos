import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BRAND_COLORS, FONT_FAMILY, MIN_TAP_TARGET_PX, RADIUS, SPACING_BY_APP, SPACING_SCALE, TYPE_SCALE } from "@hey-food/design-tokens";

import type { SupportedLanguage } from "../i18n";
import { SUPPORTED_LANGUAGES, setLanguage } from "../i18n";

const LANGUAGE_LABEL_KEY: Record<SupportedLanguage, string> = {
  en: "languageSwitcher.english",
  ms: "languageSwitcher.malay",
  zh: "languageSwitcher.chinese",
};

/**
 * Account tab's language picker — English / Bahasa Malaysia / 简体中文.
 * `i18n.language` (from useTranslation, not local state) drives which
 * option renders active, so this stays correct if the language is ever
 * changed from somewhere else too. Tapping persists the choice
 * (../i18n's setLanguage → AsyncStorage) so it survives an app restart.
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("languageSwitcher.title")}</Text>
      <View style={styles.options}>
        {SUPPORTED_LANGUAGES.map((language) => {
          const isActive = i18n.language === language;

          return (
            <Pressable
              key={language}
              style={[styles.option, isActive && styles.optionActive]}
              onPress={() => void setLanguage(language)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                {t(LANGUAGE_LABEL_KEY[language])}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const customerSpacing = SPACING_BY_APP.customer;

const styles = StyleSheet.create({
  container: {
    padding: customerSpacing.cardPaddingPx,
    gap: SPACING_SCALE[1], // 8px
    // The Account tab's scene sits on the navigator's default background
    // (#F2F2F2, the same grey as the Android status bar) — unlike Home and
    // Menu, which paint their own cream. Without this, the switcher showed
    // as a grey band running up into the status bar. The top safe-area inset
    // is NOT handled here: TabScreenShell already applies it to every tab.
    backgroundColor: BRAND_COLORS.cream,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.caption.customer,
    fontWeight: "700",
    color: BRAND_COLORS.muted,
  },
  options: {
    gap: SPACING_SCALE[1], // 8px
  },
  option: {
    minHeight: MIN_TAP_TARGET_PX.customer,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_COLORS.white,
  },
  optionActive: {
    backgroundColor: BRAND_COLORS.teal,
    borderColor: BRAND_COLORS.teal,
  },
  optionText: {
    fontFamily: FONT_FAMILY,
    fontSize: TYPE_SCALE.body.customer,
    fontWeight: "600",
    color: BRAND_COLORS.ink,
  },
  optionTextActive: {
    color: BRAND_COLORS.white,
  },
});
