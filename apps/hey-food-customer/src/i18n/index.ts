import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ms from "./locales/ms.json";
import zh from "./locales/zh.json";

export const SUPPORTED_LANGUAGES = ["en", "ms", "zh"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "hey-food-language";

function isSupportedLanguage(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Device locale detection is synchronous (expo-localization reads it from
 * the OS at call time, no I/O) — used as the default `lng` at init time so
 * the app never renders a blank/undetermined language for even one frame
 * while AsyncStorage's async read (below) resolves.
 */
function getDeviceLanguage(): SupportedLanguage {
  const languageCode = Localization.getLocales()[0]?.languageCode ?? "en";
  return isSupportedLanguage(languageCode) ? languageCode : "en";
}

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ms: { translation: ms },
    zh: { translation: zh },
  },
  lng: getDeviceLanguage(),
  fallbackLng: "en",
  // ms.json/zh.json exist with the full key set but empty string values
  // until real translations are written (next pass) — without this,
  // i18next treats "" as a real translated value and renders blank text
  // instead of falling back to fallbackLng's English string.
  returnEmptyString: false,
  interpolation: {
    // React (and React Native Text) already escapes rendered content —
    // i18next's own HTML-escaping is a web-string-concatenation concern
    // that doesn't apply here, and would double-escape special characters.
    escapeValue: false,
  },
  // React Native's Hermes engine doesn't reliably provide Intl.PluralRules
  // (varies by RN/Hermes version) — v3 pluralization uses i18next's own
  // bundled plural rules instead of the runtime's Intl API, avoiding a
  // silent fallback to non-pluralized keys on devices where it's missing.
  compatibilityJSON: "v3",
});

/**
 * Reads the persisted language preference (if the user ever manually
 * changed it) and applies it, overriding the device-locale default set at
 * init time above. Fire-and-forget from the app root — intentionally not
 * blocking initial render on this AsyncStorage read; if a persisted
 * preference exists, the UI switches to it a moment after first paint
 * rather than delaying that first paint on I/O.
 */
export async function loadPersistedLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && isSupportedLanguage(stored) && stored !== i18next.language) {
      await i18next.changeLanguage(stored);
    }
  } catch {
    // No persisted preference, or storage unavailable — device-locale
    // default from init already applied, nothing else to do.
  }
}

/** Used by the Account tab's language switcher. Persists so the choice survives an app restart. */
export async function setLanguage(language: SupportedLanguage): Promise<void> {
  await i18next.changeLanguage(language);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Persistence failed (storage unavailable) — the in-memory language
    // change above still applies for the rest of this session.
  }
}

export default i18next;
